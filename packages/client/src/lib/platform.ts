export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

export function isMac(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
}
