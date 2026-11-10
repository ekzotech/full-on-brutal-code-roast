import 'reflect-metadata';
import { createDatabase } from './database';

async function main() {
  const database = await createDatabase().initialize();
  try {
    if (process.argv[2] === 'revert') await database.undoLastMigration();
    else await database.runMigrations();
  } finally {
    await database.destroy();
  }
}

void main();
