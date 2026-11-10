import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(__dirname, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value || !['postgres:', 'postgresql:'].includes(new URL(value).protocol)) {
    throw new Error('Set DATABASE_URL to a PostgreSQL connection URL');
  }
  return value;
}

export function port() {
  const value = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error('Invalid PORT');
  return value;
}
