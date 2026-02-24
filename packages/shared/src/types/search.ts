export interface SearchQuery {
  text: string;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  after?: string;
  before?: string;
  category?: string;
  isUnread?: boolean;
  isStarred?: boolean;
}

export interface SearchResult {
  threadId: string;
  emailId: string;
  subject: string | null;
  snippet: string;
  fromAddress: string;
  fromName: string | null;
  date: string;
  rank: number;
}
