export interface Recipient {
  name?: string;
  address: string;
}

export const MOCK_CONTACTS: Recipient[] = [
  { name: 'Sarah Chen', address: 'sarah@company.com' },
  { name: 'Marcus Johnson', address: 'marcus@company.com' },
  { name: 'Priya Patel', address: 'priya@company.com' },
  { name: 'Alex Kim', address: 'alex@design.co' },
  { name: 'Jordan Rivera', address: 'jordan@design.co' },
  { name: "Liam O'Brien", address: 'liam@startup.io' },
  { name: 'AtlasMail Team', address: 'team@atlasmail.com' },
  { name: 'Stripe', address: 'billing@stripe.com' },
  { name: 'GitHub', address: 'notifications@github.com' },
  { name: 'Vercel', address: 'notifications@vercel.com' },
];
