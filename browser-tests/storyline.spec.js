import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Exercise the supported local edition with a fresh workspace, without account secrets.
const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
  .replace('data-hosted="true"', 'data-hosted="false"');

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://counterplot.test/', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('http://counterplot.test/#story');
  page.testErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.testErrors).toEqual([]);
});

test('first scene guide is visible and leads through creating and saving a scene', async ({ page }) => {
  const guide = page.getByRole('region', { name: 'Three small steps. A story that moves.' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('listitem')).toHaveCount(3);
  for (const name of ['Add a scene', 'Name what changes', 'Follow the consequence']) {
    await expect(guide.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(guide.getByRole('button', { name: 'Explore scene ideas' })).toBeVisible();
  await page.getByRole('button', { name: 'Write my first scene' }).click();
  await expect(page.getByRole('heading', { name: 'Whose choice is this?' })).toBeVisible();
  await page.getByRole('button', { name: 'Create a character' }).click();
  await expect(page.getByRole('heading', { name: 'A choice and what changes.' })).toBeVisible();
  await page.locator('[data-draft="title"]').fill('The undelivered letter');
  await page.locator('[data-draft="action"]').fill('The courier delivers the letter.');
  await page.locator('[data-draft="after"]').fill('The recipient knows the secret.');
  await page.getByRole('button', { name: 'Add scene', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'The undelivered letter', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write another scene' })).toBeVisible();
  await expect(guide).toBeVisible();
  await page.getByRole('button', { name: 'Continue from this consequence' }).click();
  const explorer = page.getByRole('region', { name: 'Scene Explorer', exact: true });
  await expect(explorer).toBeVisible();
  await expect(explorer.locator('.cause-banner')).toContainText('The recipient knows the secret.');
});

test('Explore scene ideas opens Explorer for a new user and resumes after character creation', async ({ page }) => {
  await page.getByRole('button', { name: 'Explore scene ideas' }).click();
  await expect(page).toHaveURL(/#structure$/);
  const explorer = page.getByRole('region', { name: 'Scene Explorer', exact: true });
  await expect(explorer).toBeVisible();
  await expect(explorer).toBeFocused();
  await explorer.getByRole('button', { name: 'Create a character' }).click();
  await expect(explorer.locator('[data-lab="focus"]')).not.toHaveValue('');
  await explorer.locator('[data-lab="pressure"]').selectOption({ index: 1 });
  await explorer.getByRole('button', { name: 'Explore three choices' }).click();
  await expect(explorer.locator('.route-card')).toHaveCount(3);
  await explorer.getByRole('button', { name: 'Close Scene Explorer' }).click();
  await expect(explorer).toHaveCount(0);
});

test('Explorer opens again from Storyline even when already open and keeps the viewpoint', async ({ page }) => {
  await page.getByRole('button', { name: 'Explore scene ideas' }).click();
  const explorer = page.getByRole('region', { name: 'Scene Explorer', exact: true });
  await explorer.getByRole('button', { name: 'Create a character' }).click();
  await page.locator('[data-nav="story"]').click();
  await page.getByRole('button', { name: 'Explore scene ideas' }).click();
  await expect(explorer).toBeVisible();
  await expect(explorer.locator('[data-lab="focus"]')).not.toHaveValue('');
  await page.locator('[data-nav="story"]').click();
  await page.getByRole('button', { name: 'Write my first scene' }).click();
  await expect(page.getByRole('heading', { name: 'A choice and what changes.' })).toBeVisible();
  await expect(page.locator('[data-draft="focus"]')).not.toHaveValue('');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
