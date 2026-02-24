# Part 7: Authentication Flow

AtlasMail uses Google OAuth2 with PKCE (Proof Key for Code Exchange) for both
web and Electron clients. The server acts as the token broker for the web app,
while Electron handles tokens locally.

---

## 7.1 Web App Auth Flow

```
  ┌─────────┐         ┌──────────┐         ┌──────────────┐
  │ Browser  │         │ Express  │         │ Google OAuth  │
  │ (React)  │         │ Server   │         │ Server        │
  └────┬─────┘         └────┬─────┘         └──────┬───────┘
       │                    │                      │
       │ 1. Click "Sign in  │                      │
       │    with Google"    │                      │
       │ ──────────────────>│                      │
       │                    │                      │
       │  2. Generate PKCE  │                      │
       │     code_verifier  │                      │
       │     + code_challenge                      │
       │                    │                      │
       │ 3. Return auth URL │                      │
       │    + code_verifier │                      │
       │ <──────────────────│                      │
       │                    │                      │
       │ 4. Redirect to     │                      │
       │    Google consent  │                      │
       │ ──────────────────────────────────────────>
       │                    │                      │
       │ 5. User approves   │                      │
       │    Google redirects│                      │
       │    to /auth/callback                      │
       │    with ?code=xxx  │                      │
       │ <─────────────────────────────────────────│
       │                    │                      │
       │ 6. POST /api/v1/auth/google/callback      │
       │    { code, code_verifier, redirect_uri }  │
       │ ──────────────────>│                      │
       │                    │                      │
       │                    │ 7. Exchange code for  │
       │                    │    tokens via Google  │
       │                    │ ─────────────────────>│
       │                    │                      │
       │                    │ 8. Receive            │
       │                    │    access_token,      │
       │                    │    refresh_token,     │
       │                    │    id_token           │
       │                    │ <─────────────────────│
       │                    │                      │
       │                    │ 9. Verify id_token,   │
       │                    │    upsert account,    │
       │                    │    encrypt & store    │
       │                    │    OAuth tokens,      │
       │                    │    issue JWT          │
       │                    │                      │
       │ 10. Return JWT     │                      │
       │     (access+refresh)                      │
       │ <──────────────────│                      │
       │                    │                      │
       │ 11. Store JWT in   │                      │
       │     memory (access)│                      │
       │     httpOnly cookie│                      │
       │     (refresh)      │                      │
       │                    │                      │
       │ 12. Trigger initial│                      │
       │     sync           │                      │
       │ ──────────────────>│                      │
```

### Implementation details:

```typescript
// packages/client/src/components/auth/login-page.tsx

export function LoginPage() {
  const handleGoogleLogin = async () => {
    // 1. Request auth URL from our server
    const { data } = await apiClient.get('/auth/google/url', {
      params: {
        redirect_uri: `${window.location.origin}/auth/callback`,
        state: crypto.randomUUID(),  // CSRF protection
      },
    });

    // 2. Store code_verifier in sessionStorage (survives redirect)
    sessionStorage.setItem('oauth_code_verifier', data.data.code_verifier);
    sessionStorage.setItem('oauth_state', data.data.state);

    // 3. Redirect to Google
    window.location.href = data.data.url;
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
    </div>
  );
}
```

```typescript
// packages/client/src/components/auth/oauth-callback.tsx

export function OAuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    // Verify state matches
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      navigate('/login?error=invalid_state');
      return;
    }

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    // Exchange code for tokens
    apiClient.post('/auth/google/callback', {
      code,
      code_verifier: codeVerifier,
      redirect_uri: `${window.location.origin}/auth/callback`,
    }).then(({ data }) => {
      setAuth({
        accessToken: data.data.access_token,
        account: data.data.account,
      });
      // Clean up
      sessionStorage.removeItem('oauth_code_verifier');
      sessionStorage.removeItem('oauth_state');
      navigate('/');
    }).catch(() => {
      navigate('/login?error=exchange_failed');
    });
  }, []);

  return <div>Signing in...</div>;
}
```

```typescript
// packages/server/src/services/auth.service.ts

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

export async function generateAuthUrl(redirectUri: string, state: string) {
  // Generate PKCE pair
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',       // Needed for refresh_token
    prompt: 'consent',            // Force consent to get refresh_token
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return { url, code_verifier: codeVerifier };
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
) {
  // Exchange authorization code for tokens
  const { tokens } = await oauth2Client.getToken({
    code,
    codeVerifier,
    redirect_uri: redirectUri,
  });

  // Verify the id_token to get user info
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload()!;

  // Upsert account in database
  const account = await upsertAccount({
    email: payload.email!,
    name: payload.name,
    picture_url: payload.picture,
    provider: 'google',
    provider_id: payload.sub,
    access_token: encrypt(tokens.access_token!),
    refresh_token: encrypt(tokens.refresh_token!),
    token_expires_at: new Date(tokens.expiry_date!),
  });

  // Issue our own JWT
  const accessToken = jwt.sign(
    { sub: account.id, email: account.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );

  const refreshToken = jwt.sign(
    { sub: account.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '30d' },
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      picture_url: account.picture_url,
    },
  };
}
```

### Token refresh flow:

```typescript
// packages/client/src/lib/api-client.ts

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.data.access_token;
        useAuthStore.getState().setAccessToken(newToken);

        // Retry all queued requests
        failedQueue.forEach(({ resolve }) => resolve(newToken));
        failedQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { apiClient };
```

---

## 7.2 Electron Auth Flow

Electron cannot use standard browser redirects. Instead, it registers a custom
protocol (`atlasmail://`) as a deep link handler.

```
  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
  │ Electron App │     │ System       │     │ Google OAuth  │
  │              │     │ Browser      │     │ Server        │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │
         │ 1. Generate PKCE   │                    │
         │    + auth URL with │                    │
         │    redirect_uri=   │                    │
         │    atlasmail://     │                    │
         │    auth/callback   │                    │
         │                    │                    │
         │ 2. Open system     │                    │
         │    browser with    │                    │
         │    auth URL        │                    │
         │ ──────────────────>│                    │
         │                    │                    │
         │                    │ 3. User approves   │
         │                    │ ──────────────────>│
         │                    │                    │
         │                    │ 4. Google redirects│
         │                    │    to atlasmail:// │
         │                    │    auth/callback   │
         │                    │    ?code=xxx       │
         │                    │ <──────────────────│
         │                    │                    │
         │ 5. OS routes deep  │                    │
         │    link to Electron│                    │
         │ <──────────────────│                    │
         │                    │                    │
         │ 6. Exchange code   │                    │
         │    for tokens      │                    │
         │    (direct Google  │                    │
         │    API call, no    │                    │
         │    server needed)  │                    │
         │ ────────────────────────────────────────>
         │                    │                    │
         │ 7. Receive tokens  │                    │
         │ <────────────────────────────────────────
         │                    │                    │
         │ 8. Store tokens in │                    │
         │    OS keychain via │                    │
         │    safeStorage     │                    │
         │                    │                    │
         │ 9. Notify renderer │                    │
         │    via IPC         │                    │
```

### Implementation:

```typescript
// packages/desktop/src/main.ts

import { app, BrowserWindow } from 'electron';

// Register custom protocol for deep links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('atlasmail', process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient('atlasmail');
}

// Handle the deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Handle the deep link on Windows/Linux (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('atlasmail://'));
    if (url) handleDeepLink(url);

    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

```typescript
// packages/desktop/src/ipc/auth-handler.ts

import { safeStorage, shell } from 'electron';
import { OAuth2Client } from 'google-auth-library';
import keytar from 'keytar';

const SERVICE_NAME = 'AtlasMail';

export async function initiateLogin(): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store verifier temporarily
  pendingCodeVerifier = codeVerifier;

  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    redirect_uri: 'atlasmail://auth/callback',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Open system browser (not in-app browser for security)
  await shell.openExternal(url);
}

export async function handleAuthCallback(callbackUrl: string): Promise<void> {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');

  if (!code || !pendingCodeVerifier) {
    throw new Error('Invalid auth callback');
  }

  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
  );

  const { tokens } = await oauth2Client.getToken({
    code,
    codeVerifier: pendingCodeVerifier,
    redirect_uri: 'atlasmail://auth/callback',
  });

  pendingCodeVerifier = null;

  // Store tokens securely in OS keychain
  await keytar.setPassword(SERVICE_NAME, 'access_token', tokens.access_token!);
  await keytar.setPassword(SERVICE_NAME, 'refresh_token', tokens.refresh_token!);
  await keytar.setPassword(SERVICE_NAME, 'expiry_date', String(tokens.expiry_date));

  // Get user profile
  oauth2Client.setCredentials(tokens);
  const userInfo = await oauth2Client.request({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
  });

  // Create local account record
  const db = getLocalDb();
  db.prepare(`
    INSERT OR REPLACE INTO accounts (id, email, name, picture_url, provider)
    VALUES (?, ?, ?, ?, 'google')
  `).run(
    crypto.randomUUID(),
    userInfo.data.email,
    userInfo.data.name,
    userInfo.data.picture,
  );

  // Notify renderer
  mainWindow?.webContents.send('auth:success', {
    email: userInfo.data.email,
    name: userInfo.data.name,
  });

  // Start initial sync
  startSync();
}
```

---

## 7.3 Google OAuth Scopes

| Scope                                        | Purpose                   |
|----------------------------------------------|---------------------------|
| `gmail.readonly`                             | Read emails and threads   |
| `gmail.modify`                               | Archive, label, star      |
| `gmail.compose`                              | Create drafts             |
| `gmail.send`                                 | Send emails               |
| `userinfo.email`                             | Get user email            |
| `userinfo.profile`                           | Get user name + avatar    |

### Security notes:
- We request `offline` access to get a refresh token.
- We use PKCE (S256) even though we have a client secret, as defense in depth.
- The web app never exposes the Google OAuth tokens to the browser. They stay
  on the server, encrypted at rest.
- Electron stores tokens in the OS keychain, never in localStorage or SQLite.
- Refresh tokens are rotated: when Google issues a new refresh token, we
  update the stored one.

---

## 7.4 JWT Token Strategy

| Token          | Lifetime | Storage (Web)           | Storage (Electron)        |
|----------------|----------|-------------------------|---------------------------|
| Access JWT     | 1 hour   | In-memory (Zustand)     | In-memory                 |
| Refresh JWT    | 30 days  | httpOnly cookie         | OS keychain (via keytar)  |
| Google Access  | 1 hour   | Server DB (encrypted)   | OS keychain               |
| Google Refresh | No expiry| Server DB (encrypted)   | OS keychain               |

The separation between our JWT and Google's OAuth tokens is important:
- Our JWT authenticates the user to our Express API.
- Google's tokens authenticate our server to Gmail API on behalf of the user.
- The client never sees Google's tokens in the web flow.
