import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('publishes code through the proxy and contains horizontal scrolling', async ({ page, request }) => {
  const ready = await request.get('/api/health/ready');
  expect(ready.ok()).toBe(true);
  const title = 'Compose ' + randomUUID();
  await page.goto('/');
  await page.getByRole('link', { name: '+ Новый paste' }).click();
  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Язык').selectOption('text');
  await page.getByLabel('Код', { exact: true }).fill('long '.repeat(300));
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).tap();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.reload();
  const frame = page.getByRole('region', { name: 'Исходный код' });
  await expect(frame).toBeVisible();
  expect(await frame.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
