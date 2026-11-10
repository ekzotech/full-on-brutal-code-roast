import { devices, expect, test } from '@playwright/test';
import { publish, seed } from './fixtures';

test('filters the language board and opens a paste after reload', async ({ page, request }) => {
  const python = await seed(request, 'python');
  const typescript = await seed(request);
  await page.goto('/');
  await page.getByRole('link', { name: 'Python' }).click();
  await expect(page.getByRole('heading', { name: 'Python' })).toBeVisible();
  await expect(page.getByRole('link', { name: python.title })).toBeVisible();
  await expect(page.getByRole('link', { name: typescript.title })).toHaveCount(0);
  const title = await publish(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Редактировать' })).toBeVisible();
});
