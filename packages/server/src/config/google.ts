import { OAuth2Client } from 'google-auth-library';
import { env } from './env';

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}
