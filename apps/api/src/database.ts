import { Module, OnApplicationShutdown } from '@nestjs/common';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseUrl } from './config';

export function createDatabase(url = databaseUrl()) {
  return new DataSource({
    type: 'postgres',
    url,
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  });
}

@Module({
  providers: [{ provide: DataSource, useFactory: () => createDatabase().initialize() }],
  exports: [DataSource],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly db: DataSource) {}

  async onApplicationShutdown() {
    if (this.db.isInitialized) await this.db.destroy();
  }
}
