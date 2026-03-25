/**
 * run-migrations.ts — CLI script to run pending TypeORM migrations.
 * Usage: pnpm --filter schoolos-backend run migration:run
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { resolveMigrationDatabaseConnectionOptions } from './connection-options';

async function run(): Promise<void> {
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
  console.log('Running migrations...');
  const result = await dataSource.runMigrations();
  console.log(`✓ ${result.length} migration(s) executed`);
  await dataSource.destroy();
}

run().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
