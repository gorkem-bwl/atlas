import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Common axe config — disable rules that produce too many false positives
// on dynamic SPAs with dark themes
const AXE_OPTIONS = {
  // Focus on high-impact rules
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'best-practice'],
  },
  rules: {
    // Dark themes legitimately use low-contrast text for tertiary elements
    'color-contrast': { enabled: false },
    // SPA page titles are managed by the app shell
    'page-has-heading-one': { enabled: false },
  },
};

async function checkA11y(page: import('@playwright/test').Page, name: string) {
  const results = await new AxeBuilder({ page })
    .options(AXE_OPTIONS)
    .analyze();

  const violations = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

  if (violations.length > 0) {
    const summary = violations.map((v) =>
      `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
    ).join('\n');
    console.warn(`Accessibility issues on ${name}:\n${summary}`);
  }

  // Fail only on critical violations
  const critical = violations.filter((v) => v.impact === 'critical');
  expect(critical, `Critical a11y violations on ${name}`).toHaveLength(0);
}

test.describe('Accessibility', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Login');
  });

  test('home dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await checkA11y(page, 'Home');
  });

  test('CRM page', async ({ page }) => {
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'CRM');
  });

  test('HR page', async ({ page }) => {
    await page.goto('/hr');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'HR');
  });

  test('Drive page', async ({ page }) => {
    await page.goto('/drive');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Drive');
  });

  test('Tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Tasks');
  });

  test('Tables page', async ({ page }) => {
    await page.goto('/tables');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Tables');
  });

  test('Docs page', async ({ page }) => {
    await page.goto('/docs');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Docs');
  });

  test('System page', async ({ page }) => {
    await page.goto('/system');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'System');
  });

  test('Organization page', async ({ page }) => {
    await page.goto('/org');
    await page.waitForLoadState('networkidle');
    await checkA11y(page, 'Organization');
  });
});
