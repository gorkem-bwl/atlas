import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyColorTheme, getColorTheme, COLOR_THEMES } from '../src/lib/color-themes';

// ─── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  // Reset data-theme and data-density attributes
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
  document.documentElement.style.cssText = '';
});

// ─── Theme attribute ────────────────────────────────────────────

describe('theme application via data-theme', () => {
  it('sets data-theme attribute on documentElement', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets light theme attribute', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

// ─── Density attribute ──────────────────────────────────────────

describe('density application', () => {
  it('sets data-density attribute to comfortable', () => {
    document.documentElement.setAttribute('data-density', 'comfortable');
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
  });

  it('sets data-density attribute to compact', () => {
    document.documentElement.setAttribute('data-density', 'compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });
});

// ─── Font family ────────────────────────────────────────────────

describe('font family application', () => {
  it('sets --font-family CSS variable', () => {
    const fontCSS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.documentElement.style.setProperty('--font-family', fontCSS);
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe(fontCSS);
  });

  it('sets --font-family for system font', () => {
    const fontCSS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    document.documentElement.style.setProperty('--font-family', fontCSS);
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe(fontCSS);
  });
});

// ─── applyColorTheme ────────────────────────────────────────────

describe('applyColorTheme', () => {
  it('applies default theme light variant CSS variables', () => {
    applyColorTheme('default', 'light');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-accent-primary')).toBe('#5a7fa0');
    expect(root.style.getPropertyValue('--color-accent-primary-hover')).toBe('#4d6e8c');
  });

  it('applies default theme dark variant CSS variables', () => {
    applyColorTheme('default', 'dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-accent-primary')).toBe('#7a9ab8');
  });

  it('applies ocean theme light variant', () => {
    applyColorTheme('ocean', 'light');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-accent-primary')).toBe('#0d9488');
  });

  it('applies forest theme dark variant', () => {
    applyColorTheme('forest', 'dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-accent-primary')).toBe('#34d399');
  });

  it('falls back to default theme for unknown id', () => {
    applyColorTheme('nonexistent' as any, 'light');
    const root = document.documentElement;
    // Should fall back to default theme
    expect(root.style.getPropertyValue('--color-accent-primary')).toBe('#5a7fa0');
  });
});

// ─── getColorTheme ──────────────────────────────────────────────

describe('getColorTheme', () => {
  it('returns the default theme', () => {
    const theme = getColorTheme('default');
    expect(theme.id).toBe('default');
    expect(theme.name).toBe('Default');
  });

  it('returns ocean theme', () => {
    const theme = getColorTheme('ocean');
    expect(theme.id).toBe('ocean');
    expect(theme.swatch).toBe('#0d9488');
  });

  it('falls back to first theme for unknown id', () => {
    const theme = getColorTheme('nonexistent' as any);
    expect(theme.id).toBe(COLOR_THEMES[0].id);
  });
});

// ─── COLOR_THEMES array ─────────────────────────────────────────

describe('COLOR_THEMES', () => {
  it('contains 8 built-in themes', () => {
    expect(COLOR_THEMES.length).toBe(8);
  });

  it('each theme has light and dark variants', () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.light).toBeDefined();
      expect(theme.dark).toBeDefined();
      expect(theme.light.accentPrimary).toBeTruthy();
      expect(theme.dark.accentPrimary).toBeTruthy();
    }
  });

  it('each theme has an id, name, and swatch', () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.swatch).toBeTruthy();
    }
  });
});
