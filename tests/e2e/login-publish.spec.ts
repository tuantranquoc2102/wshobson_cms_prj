import { test, expect } from '@playwright/test';

/**
 * End-to-end happy path for the editorial flow.
 *
 * Skipped by default because it needs:
 *   - A running app (`npm run dev`) on http://localhost:3000
 *   - A running Postgres (`npm run db:up`) with a fresh schema
 *   - Two seeded users: an AUTHOR and an EDITOR
 *
 * Set `RUN_E2E=1` (and ensure the prerequisites above) to enable.
 */
const ENABLED = process.env.RUN_E2E === '1';

test.describe('Login → publish flow', () => {
  test.skip(!ENABLED, 'Set RUN_E2E=1 to run this end-to-end test');

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const author = {
    email: process.env.E2E_AUTHOR_EMAIL ?? 'author@local',
    password: process.env.E2E_AUTHOR_PASSWORD ?? 'authorpass1',
  };
  const editor = {
    email: process.env.E2E_EDITOR_EMAIL ?? 'editor@local',
    password: process.env.E2E_EDITOR_PASSWORD ?? 'editorpass1',
  };
  const slug = `e2e-test-${Date.now()}`;
  const title = `E2E test post ${Date.now()}`;

  test('author submits, editor publishes, public sees it', async ({ page }) => {
    // 1. Author logs in and creates a draft.
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email').fill(author.email);
    await page.getByLabel('Password').fill(author.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin');

    await page.goto(`${baseURL}/admin/content/new`);
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Slug').fill(slug);
    await page.getByPlaceholder(/short summary/i).fill('A test post created by Playwright.');
    await page.getByRole('button', { name: /create draft/i }).click();
    await page.waitForURL('**/admin/content/**/edit');

    // 2. Author submits for review.
    await page.getByRole('button', { name: /submit for review/i }).click();
    await expect(page.getByText(/in review/i)).toBeVisible();

    // 3. Logout, log in as editor, publish from review queue.
    await page.getByRole('button', { name: author.email }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await page.waitForURL('**/login');

    await page.getByLabel('Email').fill(editor.email);
    await page.getByLabel('Password').fill(editor.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin');

    await page.goto(`${baseURL}/admin/review-queue`);
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByText(/published/i)).toBeVisible();

    // 4. Public page renders the post.
    await page.goto(`${baseURL}/blog/${slug}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });
});
