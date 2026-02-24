export interface Account {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  provider: 'google' | 'microsoft';
  providerId: string;
  historyId: number | null;
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
