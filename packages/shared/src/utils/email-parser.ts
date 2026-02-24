import type { EmailAddress } from '../types/email';

export function parseEmailAddress(raw: string): EmailAddress {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ''), address: match[2] };
  }
  return { address: raw.trim() };
}

export function formatEmailAddress(addr: EmailAddress): string {
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address;
}

export function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

export function getDomainFromEmail(email: string): string {
  return email.split('@')[1] || '';
}
