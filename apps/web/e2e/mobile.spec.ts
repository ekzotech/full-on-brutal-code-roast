import { devices, expect, test } from '@playwright/test';
import { seed } from './fixtures';

test.use(devices['Pixel 7']);

test('selects two lines by touch without widening the page', async ({ page, request }) => {
  const { id } = await seed(request, 'text', 'short\n' + 'long '.repeat(300));
  await page.goto('/pastes/' + id);
  const frame = page.getByRole('region', { name: 'Исходный код' });
  await expect(frame).toBeVisible();
  expect(await frame.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    412,
  );
  await page.getByRole('button', { name: 'Строка 1', exact: true }).tap();
  await page.getByRole('button', { name: 'Строка 2', exact: true }).tap();
  await page.getByLabel('Комментарий', { exact: true }).fill('Checked on a phone.');
  await page.getByRole('button', { name: 'Добавить комментарий' }).tap();
  await expect(page.getByRole('link', { name: 'Строки 1–2' })).toBeVisible();
});
