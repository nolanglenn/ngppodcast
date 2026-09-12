import { test, expect } from '@playwright/test';

test('episode archive search narrows to a matching episode', async ({ page }) => {
  await page.goto('/episodes');
  await page.getByLabel('Search episodes...').fill('Mock');
  await expect(page.getByText('Mock Episode One')).toBeVisible();
});

test('episode detail page renders both embeds', async ({ page }) => {
  await page.goto('/episodes/mock-episode-one');
  await expect(page.locator('iframe[title="Spotify episode player"]')).toBeVisible();
  await expect(page.locator('iframe[title="YouTube episode video"]')).toBeVisible();
});

test('retro list page renders and searches', async ({ page }) => {
  await page.goto('/retro-list');
  await expect(page.getByText('Chrono Trigger')).toBeVisible();
  await page.getByLabel('Search games...').fill('Chrono');
  await expect(page.getByText('Chrono Trigger')).toBeVisible();
});

test('home page shows latest episode and a spoiler-tagged game of the week', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mock Episode One')).toBeVisible();
  await expect(page.getByText('Chrono Trigger')).toBeHidden();
  await page.getByRole('button').hover();
  await expect(page.getByText(/Chrono Trigger/)).toBeVisible();
});
