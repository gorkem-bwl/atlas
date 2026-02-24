export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  isElectron: typeof window !== 'undefined' && !!(window as any).electronAPI,
};
