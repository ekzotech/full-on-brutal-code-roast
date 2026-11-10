import { APIRequestContext, expect, Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const source = 'const users = [];\nusers.push("review me");\nconsole.log(users);';

export async function seed(request: APIRequestContext, language = 'typescript', code = source) {
  const title = 'Review ' + randomUUID();
  const result = await request.post('/api/pastes', { data: { title, language, code } });
  expect(result.status()).toBe(201);
  return { ...await result.json() as { id: string; secret: string }, title };
}

export async function publish(page: Page) {
  const title = 'Review ' + randomUUID();
  await page.goto('/pastes/new?language=typescript');
  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Код', { exact: true }).fill(source);
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  return title;
}
