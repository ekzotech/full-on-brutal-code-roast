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

test('blocks empty and oversized code', async ({ page }) => {
  await page.goto('/pastes/new?language=typescript');
  await page.getByLabel('Заголовок').fill('Validation example');
  const submit = page.getByRole('button', { name: 'Опубликовать', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Код', { exact: true }).fill('я'.repeat(25601));
  await expect(page.getByText('Код превышает лимит.')).toBeVisible();
  await expect(submit).toBeDisabled();
});

test('comments on a line selected with the mouse', async ({ page, request }) => {
  const { id } = await seed(request);
  await page.goto('/pastes/' + id);
  await page.getByRole('button', { name: 'Строка 2', exact: true }).click();
  await page.getByLabel('Комментарий', { exact: true }).fill('Give this list a more specific name.');
  await page.getByLabel('Оценка качества').selectOption({ label: '4' });
  await page.getByRole('button', { name: 'Добавить комментарий' }).click();
  await expect(page.getByText('Качество 4 / 5')).toBeVisible();
  await page.reload();
  const comment = page.getByRole('listitem').filter({ hasText: 'Give this list a more specific name.' });
  await expect(comment.getByRole('link', { name: 'Строка 2' })).toBeVisible();
});

test('comments on a range selected by reverse drag', async ({ page, request }) => {
  const { id } = await seed(request);
  await page.goto('/pastes/' + id);
  const line = (number: number) => page.getByRole('button', { name: 'Строка ' + number, exact: true });
  await line(3).hover();
  await page.mouse.down();
  await line(1).hover();
  await page.mouse.up();
  await page.getByLabel('Комментарий', { exact: true }).fill('Review this block together.');
  await page.getByRole('button', { name: 'Добавить комментарий' }).click();
  await expect(page.getByRole('link', { name: 'Строки 1–3' })).toBeVisible();
});

test.describe('mobile review', () => {
  test.use({ ...devices['Pixel 7'], defaultBrowserType: 'chromium' });

  test('selects two lines by touch without widening the page', async ({ page, request }) => {
    const { id } = await seed(request, 'text', 'short\n' + 'long '.repeat(300));
    await page.goto('/pastes/' + id);
    const frame = page.getByRole('region', { name: 'Исходный код' });
    await expect(frame).toBeVisible();
    expect(await frame.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
    await page.getByRole('button', { name: 'Строка 1', exact: true }).tap();
    await page.getByRole('button', { name: 'Строка 2', exact: true }).tap();
    await page.getByLabel('Комментарий', { exact: true }).fill('Checked on a phone.');
    await page.getByRole('button', { name: 'Добавить комментарий' }).tap();
    await expect(page.getByRole('link', { name: 'Строки 1–2' })).toBeVisible();
  });
});
