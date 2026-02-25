export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    counts: ['threads', 'counts'] as const,
    list: (category?: string) => ['threads', 'list', category] as const,
    detail: (id: string) => ['threads', 'detail', id] as const,
    mailbox: (mailbox: string, category?: string) =>
      ['threads', 'mailbox', mailbox, category] as const,
  },
  labels: {
    all: ['labels'] as const,
    gmail: ['labels', 'gmail'] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string) => ['search', query] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  account: {
    all: ['account'] as const,
  },
  tracking: {
    all: ['tracking'] as const,
    thread: (threadId: string) => ['tracking', 'thread', threadId] as const,
  },
};
