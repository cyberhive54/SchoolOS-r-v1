type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

type DatabaseUrlSource = 'DIRECT_URL' | 'DATABASE_URL' | 'COMPOSED';

function resolveDatabaseHost(databaseUrl?: string): string {
  if (databaseUrl) {
    try {
      return new URL(databaseUrl).hostname;
    } catch {
      // Fall through to host env vars.
    }
  }

  return process.env.DATABASE_HOST ?? process.env.PGHOST ?? 'localhost';
}

function composeDatabaseUrlFromParts(): string {
  const host = process.env.DATABASE_HOST ?? process.env.PGHOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? process.env.PGPORT ?? '5432';
  const database = process.env.DATABASE_NAME ?? process.env.PGDATABASE ?? 'schoolos';
  const user = process.env.DATABASE_USER ?? process.env.PGUSER ?? 'schoolos';
  const password = process.env.DATABASE_PASSWORD ?? process.env.PGPASSWORD ?? '';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function resolveDatabaseUrl(preferDirect: boolean): { url: string; source: DatabaseUrlSource } {
  const directUrl = process.env.DIRECT_URL?.trim();
  const appUrl = process.env.DATABASE_URL?.trim();

  if (preferDirect && directUrl) {
    return { url: directUrl, source: 'DIRECT_URL' };
  }

  if (appUrl) {
    return { url: appUrl, source: 'DATABASE_URL' };
  }

  if (directUrl) {
    return { url: directUrl, source: 'DIRECT_URL' };
  }

  return { url: composeDatabaseUrlFromParts(), source: 'COMPOSED' };
}

function resolveDatabaseSslMode(databaseUrl: string): DatabaseSslMode {
  const explicit = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  if (explicit === 'disable' || explicit === 'require' || explicit === 'verify-full') {
    return explicit;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return 'disable';

  const host = resolveDatabaseHost(databaseUrl);
  return LOCAL_HOSTS.has(host) ? 'disable' : 'verify-full';
}

function resolveDatabaseSsl(mode: DatabaseSslMode): false | { rejectUnauthorized: boolean } {
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

export function resolveDatabaseConnectionOptions(): {
  url: string;
  source: DatabaseUrlSource;
  sslMode: DatabaseSslMode;
  ssl: false | { rejectUnauthorized: boolean };
} {
  const picked = resolveDatabaseUrl(false);
  const url = picked.url;
  const sslMode = resolveDatabaseSslMode(url);
  const ssl = resolveDatabaseSsl(sslMode);
  return { url, source: picked.source, sslMode, ssl };
}

export function resolveMigrationDatabaseConnectionOptions(): {
  url: string;
  source: DatabaseUrlSource;
  sslMode: DatabaseSslMode;
  ssl: false | { rejectUnauthorized: boolean };
} {
  const picked = resolveDatabaseUrl(true);
  const url = picked.url;
  const sslMode = resolveDatabaseSslMode(url);
  const ssl = resolveDatabaseSsl(sslMode);
  return { url, source: picked.source, sslMode, ssl };
}
