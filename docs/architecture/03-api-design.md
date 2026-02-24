# Part 3: API Design

All endpoints are prefixed with `/api/v1`. Responses follow a consistent
envelope format defined in `packages/shared`.

---

## 3.1 Response Envelope

```typescript
// packages/shared/src/types/api.ts

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
  error?: {
    code: string;          // Machine-readable: "AUTH_TOKEN_EXPIRED"
    message: string;       // Human-readable: "Your session has expired"
    details?: unknown;     // Validation errors, etc.
  };
}
```

**Standard HTTP status codes used:**
- 200 OK — successful GET, PUT, PATCH
- 201 Created — successful POST that creates a resource
- 204 No Content — successful DELETE
- 400 Bad Request — validation error
- 401 Unauthorized — missing or invalid token
- 403 Forbidden — valid token but insufficient permissions
- 404 Not Found
- 409 Conflict — duplicate resource
- 429 Too Many Requests — rate limit exceeded
- 500 Internal Server Error

---

## 3.2 Authentication Endpoints

```
POST   /api/v1/auth/google/callback
GET    /api/v1/auth/google/url
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### POST /api/v1/auth/google/callback
Exchange Google OAuth authorization code for tokens. Creates account if new.

**Request:**
```json
{
  "code": "4/0AX4XfWh...",
  "redirect_uri": "http://localhost:5173/auth/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "expires_in": 3600,
    "account": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "User Name",
      "picture_url": "https://..."
    }
  }
}
```

### GET /api/v1/auth/google/url
Generate Google OAuth consent URL with PKCE challenge.

**Query params:** `redirect_uri`, `state`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "code_verifier": "dBjftJeZ4CVP..."
  }
}
```

### GET /api/v1/auth/me
Return currently authenticated account info.

**Headers:** `Authorization: Bearer <jwt>`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "picture_url": "https://..."
  }
}
```

---

## 3.3 Thread Endpoints

```
GET    /api/v1/threads
GET    /api/v1/threads/:threadId
PATCH  /api/v1/threads/:threadId
POST   /api/v1/threads/:threadId/archive
POST   /api/v1/threads/:threadId/trash
POST   /api/v1/threads/:threadId/star
DELETE /api/v1/threads/:threadId/star
POST   /api/v1/threads/:threadId/read
POST   /api/v1/threads/:threadId/unread
POST   /api/v1/threads/:threadId/move
POST   /api/v1/threads/batch
```

### GET /api/v1/threads
List threads with filtering and pagination.

**Query params:**
| Param     | Type   | Default     | Description                         |
|-----------|--------|-------------|-------------------------------------|
| category  | string | —           | Filter by category                  |
| label     | string | "INBOX"     | Filter by Gmail label               |
| is_unread | boolean| —           | Filter by unread status             |
| is_starred| boolean| —           | Filter by starred status            |
| page      | number | 1           | Page number                         |
| per_page  | number | 50          | Items per page (max 100)            |
| sort      | string | "newest"    | "newest" or "oldest"                |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "gmail_thread_id": "18abc123def",
      "subject": "Re: Project update",
      "snippet": "Thanks for the update. I think we should...",
      "message_count": 4,
      "unread_count": 1,
      "has_attachments": true,
      "last_message_at": "2026-02-23T10:30:00Z",
      "category": "important",
      "labels": ["INBOX", "UNREAD"],
      "is_starred": false,
      "participants": [
        {"name": "Alice", "email": "alice@example.com"},
        {"name": "Bob", "email": "bob@example.com"}
      ]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 342,
    "has_more": true
  }
}
```

### GET /api/v1/threads/:threadId
Fetch a single thread with all messages.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "Re: Project update",
    "category": "important",
    "labels": ["INBOX"],
    "messages": [
      {
        "id": "uuid",
        "gmail_message_id": "18abc...",
        "from": {"name": "Alice", "email": "alice@example.com"},
        "to": [{"name": "You", "email": "you@gmail.com"}],
        "cc": [],
        "subject": "Project update",
        "body_html": "<div>...</div>",
        "body_text": "...",
        "internal_date": "2026-02-22T08:00:00Z",
        "is_unread": false,
        "attachments": [
          {
            "id": "uuid",
            "filename": "report.pdf",
            "mime_type": "application/pdf",
            "size": 245000
          }
        ]
      }
    ]
  }
}
```

### POST /api/v1/threads/:threadId/archive
Archive a thread (remove INBOX label).

**Response (200):**
```json
{
  "success": true,
  "data": {"id": "uuid", "is_archived": true}
}
```

### POST /api/v1/threads/:threadId/move
Move thread to a different category.

**Request:**
```json
{
  "category": "newsletters"
}
```

### POST /api/v1/threads/batch
Batch operations on multiple threads.

**Request:**
```json
{
  "thread_ids": ["uuid1", "uuid2", "uuid3"],
  "action": "archive"
}
```

Valid actions: `archive`, `trash`, `read`, `unread`, `star`, `unstar`,
`move` (requires additional `category` field).

---

## 3.4 Email (Message) Endpoints

```
GET    /api/v1/emails/:emailId
GET    /api/v1/emails/:emailId/attachments/:attachmentId
POST   /api/v1/emails/send
POST   /api/v1/emails/reply
POST   /api/v1/emails/forward
```

### POST /api/v1/emails/send
Send a new email.

**Request (multipart/form-data for attachments, or JSON):**
```json
{
  "to": [{"name": "Alice", "email": "alice@example.com"}],
  "cc": [],
  "bcc": [],
  "subject": "Hello",
  "body_html": "<p>Hi Alice</p>",
  "body_text": "Hi Alice",
  "attachments": []
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "gmail_message_id": "18abc...",
    "thread_id": "uuid"
  }
}
```

### POST /api/v1/emails/reply
Reply to an existing email.

**Request:**
```json
{
  "in_reply_to": "uuid",
  "thread_id": "uuid",
  "to": [{"email": "alice@example.com"}],
  "body_html": "<p>Thanks!</p>",
  "body_text": "Thanks!",
  "reply_all": false
}
```

### GET /api/v1/emails/:emailId/attachments/:attachmentId
Download an attachment. Proxies through to Gmail API.

**Response:** Binary stream with `Content-Type` and `Content-Disposition` headers.

---

## 3.5 Draft Endpoints

```
GET    /api/v1/drafts
POST   /api/v1/drafts
PUT    /api/v1/drafts/:draftId
DELETE /api/v1/drafts/:draftId
POST   /api/v1/drafts/:draftId/send
```

### POST /api/v1/drafts
Create a new draft (auto-saved from compose modal).

**Request:**
```json
{
  "to": [{"email": "alice@example.com"}],
  "subject": "Draft subject",
  "body_html": "<p>Work in progress</p>",
  "in_reply_to": null,
  "thread_id": null
}
```

### PUT /api/v1/drafts/:draftId
Update an existing draft (called on every auto-save, debounced to every 3s).

---

## 3.6 Search Endpoints

```
GET    /api/v1/search
GET    /api/v1/search/suggestions
```

### GET /api/v1/search
Full-text search across emails.

**Query params:**
| Param     | Type   | Default | Description                           |
|-----------|--------|---------|---------------------------------------|
| q         | string | —       | Search query (required)               |
| category  | string | —       | Filter results by category            |
| from      | string | —       | Filter by sender                      |
| to        | string | —       | Filter by recipient                   |
| has       | string | —       | "attachment", "star"                  |
| after     | string | —       | ISO date: emails after this date      |
| before    | string | —       | ISO date: emails before this date     |
| in        | string | —       | "inbox", "sent", "trash", "drafts"    |
| page      | number | 1       |                                       |
| per_page  | number | 20      |                                       |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "thread_id": "uuid",
      "email_id": "uuid",
      "subject": "Project update",
      "snippet": "...matching text <mark>highlighted</mark>...",
      "from": {"name": "Alice", "email": "alice@example.com"},
      "date": "2026-02-22T08:00:00Z",
      "rank": 0.95
    }
  ],
  "meta": {
    "page": 1,
    "total": 15,
    "query_time_ms": 42
  }
}
```

**PostgreSQL query generated:**
```sql
SELECT e.id, e.subject, e.from_name, e.from_address, e.internal_date,
       ts_headline('english', e.body_text, query, 'StartSel=<mark>, StopSel=</mark>') as snippet,
       ts_rank(e.search_vector, query) as rank
FROM emails e, plainto_tsquery('english', $1) query
WHERE e.account_id = $2
  AND e.search_vector @@ query
ORDER BY rank DESC, e.internal_date DESC
LIMIT $3 OFFSET $4;
```

### GET /api/v1/search/suggestions
Return recent searches and suggested completions.

**Query params:** `q` (partial query)
**Response:** List of suggestion strings.

---

## 3.7 Label Endpoints

```
GET    /api/v1/labels
POST   /api/v1/labels
PATCH  /api/v1/labels/:labelId
DELETE /api/v1/labels/:labelId
```

These mirror Gmail labels and allow creating custom labels.

---

## 3.8 Settings Endpoints

```
GET    /api/v1/settings
PUT    /api/v1/settings
GET    /api/v1/settings/rules
POST   /api/v1/settings/rules
PUT    /api/v1/settings/rules/:ruleId
DELETE /api/v1/settings/rules/:ruleId
```

### PUT /api/v1/settings
Update user settings (theme, shortcuts, preferences).

**Request:**
```json
{
  "theme": "dark",
  "density": "compact",
  "auto_advance": "next",
  "reading_pane": "right",
  "custom_shortcuts": {
    "archive": "e",
    "reply": "r"
  }
}
```

---

## 3.9 Sync Endpoints

```
POST   /api/v1/sync/trigger
GET    /api/v1/sync/status
POST   /api/v1/sync/webhook
```

### POST /api/v1/sync/trigger
Manually trigger an incremental sync for the authenticated account.

### GET /api/v1/sync/status
Check current sync status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "idle",
    "last_sync": "2026-02-23T10:30:00Z",
    "history_id": 123456,
    "messages_synced": 15420
  }
}
```

### POST /api/v1/sync/webhook
Receives Gmail Pub/Sub push notifications. This endpoint is called by Google
Cloud Pub/Sub, not by the client.

**Request (from Google):**
```json
{
  "message": {
    "data": "base64-encoded-data",
    "messageId": "...",
    "publishTime": "..."
  },
  "subscription": "projects/atlasmail/subscriptions/gmail-push"
}
```

---

## 3.10 Rate Limiting Strategy

| Endpoint group | Limit              | Window  |
|----------------|--------------------|---------|
| Auth endpoints | 10 requests        | 1 min   |
| Search         | 30 requests        | 1 min   |
| Send/Reply     | 20 requests        | 1 min   |
| Read endpoints | 120 requests       | 1 min   |
| Sync trigger   | 5 requests         | 1 min   |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1708704000
```

---

## 3.11 Authentication Header

All endpoints except `/api/v1/auth/*` require:
```
Authorization: Bearer <jwt>
```

The JWT contains:
```json
{
  "sub": "account-uuid",
  "email": "user@gmail.com",
  "iat": 1708700000,
  "exp": 1708703600
}
```

JWT is signed with an HS256 secret stored as an environment variable.
Access tokens expire in 1 hour. Refresh tokens expire in 30 days.
