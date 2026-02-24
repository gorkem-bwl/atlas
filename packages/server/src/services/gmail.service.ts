import { google } from 'googleapis';
import { createOAuth2Client } from '../config/google';
import { decrypt } from '../utils/crypto';
import { db } from '../config/database';
import { accounts } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getGmailClient(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new Error('Account not found');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(account.accessToken),
    refresh_token: decrypt(account.refreshToken),
    expiry_date: account.tokenExpiresAt.getTime(),
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await db.update(accounts).set({
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        updatedAt: new Date(),
      }).where(eq(accounts.id, accountId));
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function listMessageIds(accountId: string, query?: string, pageToken?: string, maxResults = 500) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query || 'in:inbox',
    maxResults,
    pageToken,
  });
  return {
    messageIds: (response.data.messages || []).map((m) => m.id!),
    nextPageToken: response.data.nextPageToken || null,
  };
}

export async function getMessage(accountId: string, messageId: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return response.data;
}

export async function batchGetMessages(accountId: string, messageIds: string[]) {
  const results = [];
  const batchSize = 50;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const messages = await Promise.all(
      batch.map((id) => getMessage(accountId, id)),
    );
    results.push(...messages);
  }
  return results;
}

export async function getHistory(accountId: string, startHistoryId: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
  });
  return response.data;
}

export async function modifyMessage(accountId: string, messageId: string, addLabels: string[], removeLabels: string[]) {
  const gmail = await getGmailClient(accountId);
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: addLabels,
      removeLabelIds: removeLabels,
    },
  });
}

export async function trashMessage(accountId: string, messageId: string) {
  const gmail = await getGmailClient(accountId);
  await gmail.users.messages.trash({ userId: 'me', id: messageId });
}

export async function sendMessage(accountId: string, raw: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
  return response.data;
}
