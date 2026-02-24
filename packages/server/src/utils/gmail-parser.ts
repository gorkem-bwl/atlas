export function parseGmailMessage(message: any) {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || null;

  const from = getHeader('from') || '';
  const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/);
  const fromName = fromMatch ? fromMatch[1].replace(/^["']|["']$/g, '') : null;
  const fromAddress = fromMatch ? fromMatch[2] : from;

  const parseAddressList = (header: string | null) => {
    if (!header) return [];
    return header.split(',').map((addr: string) => {
      const match = addr.trim().match(/^(.+?)\s*<(.+?)>$/);
      if (match) return { name: match[1].replace(/^["']|["']$/g, ''), address: match[2] };
      return { address: addr.trim() };
    });
  };

  const bodyParts = extractBody(message.payload);

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    messageIdHeader: getHeader('message-id'),
    inReplyTo: getHeader('in-reply-to'),
    referencesHeader: getHeader('references'),
    fromAddress,
    fromName,
    toAddresses: parseAddressList(getHeader('to')),
    ccAddresses: parseAddressList(getHeader('cc')),
    bccAddresses: parseAddressList(getHeader('bcc')),
    replyTo: getHeader('reply-to'),
    subject: getHeader('subject'),
    snippet: message.snippet || null,
    bodyText: bodyParts.text,
    bodyHtml: bodyParts.html,
    gmailLabels: message.labelIds || [],
    isUnread: (message.labelIds || []).includes('UNREAD'),
    isStarred: (message.labelIds || []).includes('STARRED'),
    isDraft: (message.labelIds || []).includes('DRAFT'),
    internalDate: new Date(parseInt(message.internalDate, 10)).toISOString(),
    sizeEstimate: message.sizeEstimate || null,
  };
}

function extractBody(payload: any): { text: string | null; html: string | null } {
  let text: string | null = null;
  let html: string | null = null;

  function walk(part: any) {
    if (!part) return;
    const mimeType = part.mimeType || '';
    if (mimeType === 'text/plain' && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
    if (mimeType === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
    if (part.parts) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);
  return { text, html };
}

export function extractAttachments(message: any): any[] {
  const attachments: any[] = [];

  function walk(part: any) {
    if (!part) return;
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        gmailAttachmentId: part.body?.attachmentId || null,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size || 0,
        contentId: part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id')?.value || null,
        isInline: (part.headers?.find((h: any) => h.name.toLowerCase() === 'content-disposition')?.value || '').includes('inline'),
      });
    }
    if (part.parts) part.parts.forEach(walk);
  }

  walk(message.payload);
  return attachments;
}
