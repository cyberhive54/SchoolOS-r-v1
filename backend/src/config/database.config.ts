import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { join } from 'path';

type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

function resolveDatabaseHost(config: ConfigService, databaseUrl?: string): string {
  if (databaseUrl) {
    try {
      return new URL(databaseUrl).hostname;
    } catch {
      // Fall through to host env vars when URL parsing fails.
    }
  }

  return config.get<string>('DATABASE_HOST')
    ?? config.get<string>('PGHOST')
    ?? 'localhost';
}

function resolveDatabaseSslMode(
  config: ConfigService,
  isProduction: boolean,
  databaseUrl?: string,
): DatabaseSslMode {
  const explicit = config.get<string>('DATABASE_SSL_MODE')?.toLowerCase();
  if (explicit === 'disable' || explicit === 'require' || explicit === 'verify-full') {
    return explicit;
  }

  if (!isProduction) return 'disable';

  const host = resolveDatabaseHost(config, databaseUrl);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

  return localHosts.has(host) ? 'disable' : 'verify-full';
}

function resolveDatabaseSsl(mode: DatabaseSslMode): PostgresConnectionOptions['ssl'] {
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

export function getTypeOrmConfig(config: ConfigService): TypeOrmModuleOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  const databaseUrl = config.get<string>('DATABASE_URL');
  const sslMode = resolveDatabaseSslMode(config, isProduction, databaseUrl);
  const ssl = resolveDatabaseSsl(sslMode);

  const base: TypeOrmModuleOptions = {
    type: 'postgres',
    synchronize: false,
    logging: isProduction ? ['error', 'warn'] : ['error', 'warn'],
    entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsRun: false,
    ssl,
    extra: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };

  if (databaseUrl) {
    return { ...base, url: databaseUrl };
  }

  return {
    ...base,
    host: resolveDatabaseHost(config),
    port: config.get<number>('DATABASE_PORT') ?? config.get<number>('PGPORT') ?? 5432,
    database: config.get<string>('DATABASE_NAME') ?? config.get<string>('PGDATABASE') ?? 'schoolos',
    username: config.get<string>('DATABASE_USER') ?? config.get<string>('PGUSER') ?? 'schoolos',
    password: config.get<string>('DATABASE_PASSWORD') ?? config.get<string>('PGPASSWORD') ?? '',
  };
}
