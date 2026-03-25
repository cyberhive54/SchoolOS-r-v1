/**
 * revert-migration.ts — CLI script to revert the last TypeORM migration.
 * Usage: pnpm --filter schoolos-backend run migration:revert
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { resolveMigrationDatabaseConnectionOptions } from './connection-options';

async function revert(): Promise<void> {
  const db = resolveMigrationDatabaseConnectionOptions();
  const dataSource = new DataSource({
    type: 'postgres',
    url: db.url,
    ssl: db.ssl,
    synchronize: false,
    logging: true,
    entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
    migrations: [join(__dirname, './migrations/*.{ts,js}')],
  });

  await dataSource.initialize();
  console.log(`Database URL source: ${db.source}`);
  console.log(`Database SSL mode: ${db.sslMode}`);
  console.log('Reverting last migration...');
  await dataSource.undoLastMigration();
  console.log('✓ Last migration reverted');
  await dataSource.destroy();
}

revert().catch((err: unknown) => {
  console.error('Revert failed:', err);
  process.exit(1);
});
