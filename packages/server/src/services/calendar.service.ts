import { google } from 'googleapis';
import { createOAuth2Client } from '../config/google';
import { decrypt, encrypt } from '../utils/crypto';
import { db } from '../config/database';
import { accounts, calendars, calendarEvents } from '../db/schema';
import { eq, and, gte, lte, sql, inArray, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type { CalendarEventCreateInput, CalendarEventUpdateInput } from '@atlasmail/shared';

// ─── Calendar API client ─────────────────────────────────────────────

async function getCalendarClient(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new Error('Account not found');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(account.accessToken),
    refresh_token: decrypt(account.refreshToken),
    expiry_date: new Date(account.tokenExpiresAt).getTime(),
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      const updates: Record<string, string> = {
        accessToken: encrypt(tokens.access_token),
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (tokens.refresh_token) {
        updates.refreshToken = encrypt(tokens.refresh_token);
      }
      await db.update(accounts).set(updates).where(eq(accounts.id, accountId));
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// ─── Sync calendar list ──────────────────────────────────────────────

export async function syncCalendarList(accountId: string) {
  const cal = await getCalendarClient(accountId);
  const now = new Date().toISOString();
  let nextPageToken: string | undefined;
  let synced = 0;

  do {
    const res = await cal.calendarList.list({ pageToken: nextPageToken });
    const items = res.data.items || [];

    for (const item of items) {
      if (!item.id) continue;

      await db
        .insert(calendars)
        .values({
          accountId,
          googleCalendarId: item.id,
          summary: item.summary || null,
          description: item.description || null,
          backgroundColor: item.backgroundColor || null,
          foregroundColor: item.foregroundColor || null,
          timeZone: item.timeZone || null,
          accessRole: item.accessRole || null,
          isPrimary: item.primary === true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [calendars.accountId, calendars.googleCalendarId],
          set: {
            summary: item.summary || null,
            description: item.description || null,
            backgroundColor: item.backgroundColor || null,
            foregroundColor: item.foregroundColor || null,
            timeZone: item.timeZone || null,
            accessRole: item.accessRole || null,
            isPrimary: item.primary === true,
            updatedAt: now,
          },
        });

      synced++;
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);

  logger.info({ accountId, synced }, 'Calendar list sync complete');
}

// ─── Sync calendar events ────────────────────────────────────────────

export async function syncCalendarEvents(
  accountId: string,
  calendarDbId: string,
  timeMin: string,
  timeMax: string,
) {
  const [calRow] = await db
    .select()
    .from(calendars)
    .where(and(eq(calendars.id, calendarDbId), eq(calendars.accountId, accountId)))
    .limit(1);

  if (!calRow) throw new Error('Calendar not found');

  const cal = await getCalendarClient(accountId);
  const now = new Date().toISOString();
  let nextPageToken: string | undefined;
  let upserted = 0;

  // Try incremental sync first
  if (calRow.syncToken) {
    try {
      await syncWithToken(cal, accountId, calendarDbId, calRow.googleCalendarId, calRow.syncToken, now);
      return;
    } catch (err: any) {
      if (err?.code === 410) {
        // Sync token expired, clear and do full sync
        logger.info({ accountId, calendarDbId }, 'Calendar sync token expired, falling back to full sync');
        await db.update(calendars).set({ syncToken: null }).where(eq(calendars.id, calendarDbId));
      } else {
        throw err;
      }
    }
  }

  // Full sync with time range
  do {
    const res = await cal.events.list({
      calendarId: calRow.googleCalendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
      pageToken: nextPageToken,
    });

    const items = res.data.items || [];
    for (const item of items) {
      await upsertEvent(accountId, calendarDbId, item, now);
      upserted++;
    }

    // Save sync token from the last page
    if (res.data.nextSyncToken) {
      await db.update(calendars).set({
        syncToken: res.data.nextSyncToken,
        lastSyncAt: now,
        updatedAt: now,
      }).where(eq(calendars.id, calendarDbId));
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);

  logger.info({ accountId, calendarDbId, upserted }, 'Calendar events sync complete');
}

async function syncWithToken(
  cal: Awaited<ReturnType<typeof getCalendarClient>>,
  accountId: string,
  calendarDbId: string,
  googleCalendarId: string,
  syncToken: string,
  now: string,
) {
  let nextPageToken: string | undefined;
  let processed = 0;

  do {
    const res = await cal.events.list({
      calendarId: googleCalendarId,
      syncToken,
      pageToken: nextPageToken,
      showDeleted: true,
    });

    const items = res.data.items || [];
    for (const item of items) {
      if (item.status === 'cancelled') {
        // Delete cancelled events
        await db
          .delete(calendarEvents)
          .where(
            and(
              eq(calendarEvents.accountId, accountId),
              eq(calendarEvents.googleEventId, item.id!),
            ),
          );
      } else {
        await upsertEvent(accountId, calendarDbId, item, now);
      }
      processed++;
    }

    if (res.data.nextSyncToken) {
      await db.update(calendars).set({
        syncToken: res.data.nextSyncToken,
        lastSyncAt: now,
        updatedAt: now,
      }).where(eq(calendars.id, calendarDbId));
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);

  logger.info({ accountId, calendarDbId, processed }, 'Incremental calendar sync complete');
}

async function upsertEvent(
  accountId: string,
  calendarDbId: string,
  item: any,
  now: string,
) {
  if (!item.id) return;

  const isAllDay = !!item.start?.date;
  const startTime = isAllDay ? item.start.date : item.start?.dateTime;
  const endTime = isAllDay ? item.end?.date : item.end?.dateTime;

  if (!startTime || !endTime) return;

  await db
    .insert(calendarEvents)
    .values({
      accountId,
      calendarId: calendarDbId,
      googleEventId: item.id,
      summary: item.summary || null,
      description: item.description || null,
      location: item.location || null,
      startTime,
      endTime,
      isAllDay,
      status: item.status || 'confirmed',
      selfResponseStatus: getSelfResponseStatus(item.attendees),
      htmlLink: item.htmlLink || null,
      hangoutLink: item.hangoutLink || null,
      organizer: item.organizer || null,
      attendees: item.attendees || null,
      recurrence: item.recurrence || null,
      recurringEventId: item.recurringEventId || null,
      colorId: item.colorId || null,
      reminders: item.reminders || null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [calendarEvents.accountId, calendarEvents.googleEventId],
      set: {
        calendarId: calendarDbId,
        summary: item.summary || null,
        description: item.description || null,
        location: item.location || null,
        startTime,
        endTime,
        isAllDay,
        status: item.status || 'confirmed',
        selfResponseStatus: getSelfResponseStatus(item.attendees),
        htmlLink: item.htmlLink || null,
        hangoutLink: item.hangoutLink || null,
        organizer: item.organizer || null,
        attendees: item.attendees || null,
        recurrence: item.recurrence || null,
        recurringEventId: item.recurringEventId || null,
        colorId: item.colorId || null,
        reminders: item.reminders || null,
        updatedAt: now,
      },
    });
}

function getSelfResponseStatus(attendees: any[] | undefined): string | null {
  if (!attendees) return null;
  const self = attendees.find((a: any) => a.self === true);
  return self?.responseStatus || null;
}

// ─── Query helpers ───────────────────────────────────────────────────

export async function listCalendars(accountId: string) {
  return db
    .select()
    .from(calendars)
    .where(eq(calendars.accountId, accountId))
    .orderBy(desc(calendars.isPrimary), calendars.summary);
}

export async function listEvents(
  accountId: string,
  timeMin: string,
  timeMax: string,
  calendarIds?: string[],
) {
  const conditions = [
    eq(calendarEvents.accountId, accountId),
    lte(calendarEvents.startTime, timeMax),
    gte(calendarEvents.endTime, timeMin),
  ];

  if (calendarIds && calendarIds.length > 0) {
    conditions.push(inArray(calendarEvents.calendarId, calendarIds));
  }

  return db
    .select()
    .from(calendarEvents)
    .where(and(...conditions))
    .orderBy(calendarEvents.startTime);
}

// ─── CRUD operations ─────────────────────────────────────────────────

export async function createEvent(accountId: string, input: CalendarEventCreateInput) {
  // Resolve the Google calendar ID from our DB calendar ID
  const [calRow] = await db
    .select()
    .from(calendars)
    .where(and(eq(calendars.id, input.calendarId), eq(calendars.accountId, accountId)))
    .limit(1);

  if (!calRow) throw new Error('Calendar not found');

  const cal = await getCalendarClient(accountId);
  const now = new Date().toISOString();

  const eventResource: any = {
    summary: input.summary,
    description: input.description,
    location: input.location,
  };

  if (input.isAllDay) {
    eventResource.start = { date: input.startTime.slice(0, 10) };
    eventResource.end = { date: input.endTime.slice(0, 10) };
  } else {
    eventResource.start = { dateTime: input.startTime };
    eventResource.end = { dateTime: input.endTime };
  }

  if (input.attendees?.length) {
    eventResource.attendees = input.attendees;
  }
  if (input.colorId) {
    eventResource.colorId = input.colorId;
  }

  const res = await cal.events.insert({
    calendarId: calRow.googleCalendarId,
    requestBody: eventResource,
    sendUpdates: 'all',
  });

  const created = res.data;
  await upsertEvent(accountId, calRow.id, created, now);

  // Return the local DB record
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.accountId, accountId),
        eq(calendarEvents.googleEventId, created.id!),
      ),
    )
    .limit(1);

  return event;
}

export async function updateEvent(
  accountId: string,
  eventId: string,
  input: CalendarEventUpdateInput,
) {
  // Find the existing event
  const [existing] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.accountId, accountId)))
    .limit(1);

  if (!existing) throw new Error('Event not found');

  // Get the calendar
  const [calRow] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, existing.calendarId))
    .limit(1);

  if (!calRow) throw new Error('Calendar not found');

  const cal = await getCalendarClient(accountId);
  const now = new Date().toISOString();

  const patch: any = {};
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.description !== undefined) patch.description = input.description;
  if (input.location !== undefined) patch.location = input.location;
  if (input.attendees !== undefined) patch.attendees = input.attendees;
  if (input.colorId !== undefined) patch.colorId = input.colorId;

  if (input.startTime !== undefined || input.endTime !== undefined) {
    const isAllDay = input.isAllDay ?? existing.isAllDay;
    if (isAllDay) {
      if (input.startTime) patch.start = { date: input.startTime.slice(0, 10) };
      if (input.endTime) patch.end = { date: input.endTime.slice(0, 10) };
    } else {
      if (input.startTime) patch.start = { dateTime: input.startTime };
      if (input.endTime) patch.end = { dateTime: input.endTime };
    }
  }

  const scope = input.recurringEditScope || 'single';

  // Determine which Google event ID to patch
  let targetGoogleEventId = existing.googleEventId;

  if (scope === 'all' && existing.recurringEventId) {
    // Patch the parent recurring event instead of the instance
    targetGoogleEventId = existing.recurringEventId;
    // Remove time changes when editing all instances — times are per-instance
    delete patch.start;
    delete patch.end;
  }

  const res = await cal.events.patch({
    calendarId: calRow.googleCalendarId,
    eventId: targetGoogleEventId,
    requestBody: patch,
    sendUpdates: 'all',
  });

  await upsertEvent(accountId, calRow.id, res.data, now);

  // For 'all' scope, re-sync to update all instances in our DB
  if (scope === 'all' && existing.recurringEventId) {
    // Sync events for this calendar to pull in updated instances
    const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await syncCalendarEvents(accountId, calRow.id, timeMin, timeMax);
    } catch (err) {
      logger.warn({ err }, 'Failed to re-sync after updating all recurring instances');
    }
  }

  const [updated] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  return updated;
}

export async function deleteEvent(
  accountId: string,
  eventId: string,
  scope: 'single' | 'all' = 'single',
) {
  const [existing] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.accountId, accountId)))
    .limit(1);

  if (!existing) throw new Error('Event not found');

  const [calRow] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, existing.calendarId))
    .limit(1);

  if (!calRow) throw new Error('Calendar not found');

  const cal = await getCalendarClient(accountId);

  if (scope === 'all' && existing.recurringEventId) {
    // Delete the parent recurring event, which deletes all instances
    await cal.events.delete({
      calendarId: calRow.googleCalendarId,
      eventId: existing.recurringEventId,
      sendUpdates: 'all',
    });

    // Remove all local instances of this recurring event
    await db
      .delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.accountId, accountId),
          eq(calendarEvents.recurringEventId, existing.recurringEventId),
        ),
      );
    // Also delete the parent event itself if stored
    await db
      .delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.accountId, accountId),
          eq(calendarEvents.googleEventId, existing.recurringEventId),
        ),
      );
  } else {
    // Delete just this instance
    await cal.events.delete({
      calendarId: calRow.googleCalendarId,
      eventId: existing.googleEventId,
      sendUpdates: 'all',
    });

    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  }
}

export async function toggleCalendarSelected(
  accountId: string,
  calendarDbId: string,
  isSelected: boolean,
) {
  await db
    .update(calendars)
    .set({ isSelected, updatedAt: new Date().toISOString() })
    .where(and(eq(calendars.id, calendarDbId), eq(calendars.accountId, accountId)));
}

// ─── Create a new calendar ───────────────────────────────────────────

export async function createCalendar(
  accountId: string,
  input: { summary: string; description?: string; backgroundColor?: string },
) {
  const cal = await getCalendarClient(accountId);

  const res = await cal.calendars.insert({
    requestBody: {
      summary: input.summary,
      description: input.description,
    },
  });

  const googleCalId = res.data.id;
  if (!googleCalId) throw new Error('Failed to create calendar');

  // Set color on the calendar list entry if provided
  if (input.backgroundColor) {
    await cal.calendarList.patch({
      calendarId: googleCalId,
      requestBody: {
        backgroundColor: input.backgroundColor,
        foregroundColor: '#ffffff',
      },
      colorRgbFormat: true,
    });
  }

  const now = new Date().toISOString();
  const [inserted] = await db
    .insert(calendars)
    .values({
      accountId,
      googleCalendarId: googleCalId,
      summary: input.summary,
      description: input.description || null,
      backgroundColor: input.backgroundColor || null,
      foregroundColor: input.backgroundColor ? '#ffffff' : null,
      timeZone: res.data.timeZone || null,
      accessRole: 'owner',
      isPrimary: false,
      isSelected: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ accountId, calendarId: inserted.id }, 'Calendar created');
  return inserted;
}
