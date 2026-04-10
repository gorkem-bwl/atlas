# Part 4: Gmail Sync Architecture

The sync system is the most critical piece of AtlasMail. It must handle initial
full sync of thousands of emails, incremental sync for real-time updates, and
graceful recovery from failures.

---

## 4.1 Sync Overview

```
                    ┌──────────────────────────────────────┐
                    │           Google Gmail API            │
                    └──────┬───────────────┬───────────────┘
                           │               │
              ┌────────────┴──┐    ┌───────┴─────────┐
              │  REST polling │    │ Pub/Sub push     │
              │  (historyId)  │    │ notifications    │
              └──────┬────────┘    └──────┬───────────┘
                     │                    │
                     ▼                    ▼
              ┌──────────────────────────────────────┐
              │          Sync Service                 │
              │  (packages/server/src/services/       │
              │   sync.service.ts)                    │
              │                                       │
              │  ┌──────────┐  ┌──────────────────┐  │
              │  │ Full Sync│  │ Incremental Sync │  │
              │  │ (initial)│  │ (delta via        │  │
              │  │          │  │  history.list)    │  │
              │  └────┬─────┘  └────────┬─────────┘  │
              │       │                 │             │
              │       ▼                 ▼             │
              │  ┌──────────────────────────────┐    │
              │  │    Message Processor          │    │
              │  │  - Parse Gmail response       │    │
              │  │  - Categorize                 │    │
              │  │  - Upsert to PostgreSQL       │    │
              │  │  - Update thread aggregates   │    │
              │  └──────────────────────────────┘    │
              └──────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  PostgreSQL   │
              └──────────────┘

  Electron (desktop) runs the same logic but writes to local SQLite
  and calls Gmail API directly (no server intermediary).
```

---

## 4.2 Initial Full Sync

Triggered when a user first connects their Gmail account.

### Step-by-step flow:

```typescript
// packages/server/src/services/sync.service.ts

async function performFullSync(accountId: string): Promise<void> {
  const account = await getAccount(accountId);
  const gmail = createGmailClient(account);

  // 1. Update sync status
  await updateAccount(accountId, { sync_status: 'syncing' });

  // 2. Get current historyId (our "checkpoint" for future incremental syncs)
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const startHistoryId = profile.data.historyId;

  // 3. List all message IDs in batches
  //    We only need IDs first, then batch-fetch full messages.
  let pageToken: string | undefined;
  const allMessageIds: string[] = [];

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,        // Max allowed by Gmail API
      pageToken,
      labelIds: ['INBOX'],    // Start with INBOX, expand later
    });

    const messages = response.data.messages || [];
    allMessageIds.push(...messages.map(m => m.id!));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  // 4. Batch-fetch full message details
  //    Gmail API supports batch requests (up to 100 per batch).
  //    We use googleapis batch support or parallel individual requests.
  const BATCH_SIZE = 50;
  for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
    const batch = allMessageIds.slice(i, i + BATCH_SIZE);

    const messages = await Promise.all(
      batch.map(id =>
        gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',    // includes headers + body
        })
      )
    );

    // 5. Process each message
    await processMessageBatch(accountId, messages.map(m => m.data));

    // 6. Emit progress event (for UI progress bar)
    emitSyncProgress(accountId, {
      processed: i + batch.length,
      total: allMessageIds.length,
    });
  }

  // 7. Save checkpoint and update status
  await updateAccount(accountId, {
    history_id: startHistoryId,
    last_full_sync: new Date(),
    last_sync: new Date(),
    sync_status: 'idle',
  });
}
```

### Message processing pipeline:

```typescript
async function processMessageBatch(
  accountId: string,
  gmailMessages: gmail_v1.Schema$Message[]
): Promise<void> {
  for (const msg of gmailMessages) {
    // 1. Parse Gmail response into our Email type
    const parsed = parseGmailMessage(msg);

    // 2. Upsert thread
    const thread = await upsertThread(accountId, {
      gmail_thread_id: msg.threadId!,
      subject: parsed.subject,
      labels: parsed.labels,
    });

    // 3. Upsert email
    await upsertEmail(accountId, thread.id, parsed);

    // 4. Categorize thread
    const category = await categorizeThread(accountId, thread, parsed);
    await updateThreadCategory(thread.id, category);

    // 5. Update thread denormalized fields
    await refreshThreadAggregates(thread.id);

    // 6. Extract contacts for autocomplete
    await upsertContacts(accountId, parsed);
  }
}
```

### Full sync strategy notes:

- **Priority ordering:** Sync newest emails first so the user sees their inbox
  immediately. The full historical sync continues in the background.
- **Resumability:** If the sync is interrupted (server restart, network error),
  store the last processed page token in `sync_metadata`. Resume from there.
- **Rate limits:** Gmail API allows 250 quota units per second per user. A
  `messages.get` costs 5 units. With batching, we can fetch ~50 messages/second.
  Full sync of 10,000 emails takes ~3.5 minutes.
- **Body storage:** For v1, store full body HTML in the database. For v2,
  consider storing bodies in object storage (S3/R2) and keeping only snippets
  in the database.

---

## 4.3 Incremental Sync via historyId

After full sync, Gmail tracks all changes to the mailbox via a monotonically
increasing `historyId`. We poll `users.history.list` to get changes since our
last known historyId.

```typescript
async function performIncrementalSync(accountId: string): Promise<void> {
  const account = await getAccount(accountId);
  if (!account.history_id) {
    // No historyId means full sync hasn't completed — trigger it
    return performFullSync(accountId);
  }

  const gmail = createGmailClient(account);

  try {
    let pageToken: string | undefined;
    let newHistoryId = account.history_id;

    do {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: String(account.history_id),
        historyTypes: [
          'messageAdded',
          'messageDeleted',
          'labelAdded',
          'labelRemoved',
        ],
        pageToken,
      });

      const histories = response.data.history || [];
      newHistoryId = Number(response.data.historyId);

      for (const history of histories) {
        // Handle new messages
        if (history.messagesAdded) {
          for (const added of history.messagesAdded) {
            const fullMsg = await gmail.users.messages.get({
              userId: 'me',
              id: added.message!.id!,
              format: 'full',
            });
            await processMessageBatch(accountId, [fullMsg.data]);
          }
        }

        // Handle deleted messages
        if (history.messagesDeleted) {
          for (const deleted of history.messagesDeleted) {
            await markEmailDeleted(accountId, deleted.message!.id!);
          }
        }

        // Handle label changes (read/unread, archive, star, etc.)
        if (history.labelsAdded) {
          for (const change of history.labelsAdded) {
            await updateEmailLabels(
              accountId,
              change.message!.id!,
              change.labelIds!,
              'add'
            );
          }
        }

        if (history.labelsRemoved) {
          for (const change of history.labelsRemoved) {
            await updateEmailLabels(
              accountId,
              change.message!.id!,
              change.labelIds!,
              'remove'
            );
          }
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    // Update checkpoint
    await updateAccount(accountId, {
      history_id: newHistoryId,
      last_sync: new Date(),
      sync_status: 'idle',
    });

  } catch (error: any) {
    // historyId expired (Gmail only keeps ~7 days of history)
    // Fall back to full sync
    if (error.code === 404) {
      console.warn('historyId expired, triggering full re-sync');
      await performFullSync(accountId);
    } else {
      throw error;
    }
  }
}
```

---

## 4.4 Push Notifications via Gmail Pub/Sub

Instead of polling every 30 seconds, Gmail can push real-time notifications
via Google Cloud Pub/Sub.

### Setup (one-time):

1. Create a Google Cloud Pub/Sub topic: `projects/atlas/topics/gmail-push`
2. Create a subscription that pushes to our webhook:
   `POST /api/v1/sync/webhook`
3. Grant Gmail's service account publish permission on the topic.

### Watch registration (per account):

```typescript
async function registerGmailWatch(accountId: string): Promise<void> {
  const gmail = createGmailClient(account);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: 'projects/atlas/topics/gmail-push',
      labelIds: ['INBOX'],
    },
  });

  // Watch expires after ~7 days. Store expiration and renew before it expires.
  await updateAccount(accountId, {
    watch_expiration: new Date(Number(response.data.expiration)),
    history_id: Number(response.data.historyId),
  });
}
```

### Webhook handler:

```typescript
// packages/server/src/services/pubsub.service.ts

async function handlePushNotification(body: PubSubMessage): Promise<void> {
  // 1. Decode the Pub/Sub message
  const data = JSON.parse(
    Buffer.from(body.message.data, 'base64').toString('utf8')
  );
  // data = { emailAddress: "user@gmail.com", historyId: 123457 }

  // 2. Find the account
  const account = await getAccountByEmail(data.emailAddress);
  if (!account) return;

  // 3. Enqueue incremental sync job (avoid processing in webhook handler)
  await syncQueue.add('incremental-sync', {
    accountId: account.id,
    triggeredBy: 'push',
  });
}
```

### Sync scheduling (BullMQ):

```typescript
// packages/server/src/jobs/sync-scheduler.ts

import { Queue, Worker } from 'bullmq';

const syncQueue = new Queue('email-sync', { connection: redis });

// Fallback: poll every 60 seconds even with push notifications
// (push can fail silently)
async function schedulePeriodicSync(accountId: string): Promise<void> {
  await syncQueue.add(
    'incremental-sync',
    { accountId, triggeredBy: 'scheduled' },
    {
      repeat: { every: 60_000 },
      jobId: `sync-${accountId}`,  // Prevents duplicate jobs
    }
  );
}

// Worker
const syncWorker = new Worker('email-sync', async (job) => {
  const { accountId } = job.data;

  // Debounce: skip if last sync was < 10 seconds ago
  const account = await getAccount(accountId);
  const timeSinceLastSync = Date.now() - new Date(account.last_sync).getTime();
  if (timeSinceLastSync < 10_000) return;

  await performIncrementalSync(accountId);
}, { connection: redis, concurrency: 5 });
```

---

## 4.5 Electron (Desktop) Sync

In Electron, the sync runs entirely in the main process without going through
the Express server. This enables offline-first behavior.

```
  ┌─────────────────┐         ┌─────────────────┐
  │  Electron Main   │────────▶│  Gmail API       │
  │  Process          │◀────────│  (direct HTTPS)  │
  │                   │         └─────────────────┘
  │  sync-handler.ts  │
  │  gmail-direct.ts  │
  │  local-db.ts      │
  └────────┬──────────┘
           │ IPC
           ▼
  ┌─────────────────┐
  │  Renderer         │
  │  (React app)      │
  │  reads from       │
  │  local SQLite     │
  └─────────────────┘
```

- Tokens are stored in the OS keychain (macOS Keychain, Windows Credential
  Manager, Linux Secret Service) via `safeStorage`.
- Sync runs on a 60-second interval in the main process.
- Changes are written to SQLite via `better-sqlite3`.
- The renderer is notified of new data via IPC messages, which trigger
  TanStack Query cache invalidation.
- When online, Electron also syncs changes to the PostgreSQL server so the
  web app stays in sync. When offline, changes queue and sync later.

---

## 4.6 Bidirectional Sync (Actions)

When the user performs an action (archive, star, mark read), it must propagate
both to Gmail and to our database.

```typescript
async function archiveThread(accountId: string, threadId: string): Promise<void> {
  // 1. Optimistic update: update local state immediately
  await updateThread(threadId, { is_archived: true });

  // 2. Remove INBOX label via Gmail API
  const gmail = createGmailClient(account);
  await gmail.users.threads.modify({
    userId: 'me',
    id: gmailThreadId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });

  // 3. If Gmail call fails, rollback local state
  // (handled by try/catch with rollback)
}
```

In Electron, the same flow happens but writes to SQLite first, then syncs
the action to Gmail. If offline, the action is queued:

```typescript
// packages/desktop/src/services/action-queue.ts

interface PendingAction {
  id: string;
  type: 'archive' | 'trash' | 'star' | 'unstar' | 'read' | 'unread';
  thread_id: string;
  gmail_thread_id: string;
  created_at: string;
}

// Stored in SQLite table: pending_actions
// Processed when connectivity is restored
```

---

## 4.7 Sync Performance Targets

| Metric                        | Target         |
|-------------------------------|----------------|
| Initial sync (1,000 emails)   | < 60 seconds   |
| Initial sync (10,000 emails)  | < 5 minutes    |
| Incremental sync (new email)  | < 3 seconds    |
| Push notification latency     | < 5 seconds    |
| Inbox render after sync       | < 100ms        |
