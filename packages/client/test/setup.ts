import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ─── Mock localStorage ───────────────────────────────────────────
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
});

// ─── Mock API client ─────────────────────────────────────────────
vi.mock('../src/lib/api-client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: null } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: null } }),
    put: vi.fn().mockResolvedValue({ data: { success: true, data: null } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true, data: null } }),
  },
}));

// ─── Mock i18n ───────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ─── Mock IntersectionObserver ───────────────────────────────────
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

// ─── Mock ResizeObserver ─────────────────────────────────────────
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

// ─── Mock matchMedia ─────────────────────────────────────────────
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
