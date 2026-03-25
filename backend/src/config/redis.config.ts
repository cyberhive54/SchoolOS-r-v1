import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

let redisErrorLogged = false;

function resolveRedisConnection(config: ConfigService): Record<string, unknown> {
  const redisUrlRaw = config.get<string>('REDIS_URL')?.trim();
  const redisPassword = config.get<string>('REDIS_PASSWORD')?.trim();

  if (redisUrlRaw) {
    try {
      const parsed = new URL(redisUrlRaw);
      const host = parsed.hostname || 'localhost';
      const port = Number(parsed.port || '6379');
      const passwordFromUrl = parsed.password || undefined;
      const password = redisPassword || passwordFromUrl;

      const connection: Record<string, unknown> = { host, port };
      if (password) connection.password = password;
      if (parsed.protocol === 'rediss:') {
        connection.tls = { rejectUnauthorized: false };
      }
      return connection;
    } catch {
      // Fall through to host/port env vars when REDIS_URL is malformed.
    }
  }

  const connection: Record<string, unknown> = {
    host: config.get<string>('REDIS_HOST') ?? 'localhost',
    port: config.get<number>('REDIS_PORT') ?? 6379,
  };

  if (redisPassword) {
    connection.password = redisPassword;
  }

  return connection;
}

export function getRedisConfig(config: ConfigService): BullRootModuleOptions {
  const connection = resolveRedisConnection(config);

  return {
    connection: {
      ...connection,
      // Exponential backoff: 1s -> 2s -> 4s, capped at 30s.
      // Prevents log flooding when Redis is unavailable.
      retryStrategy: (times: number) => Math.min(times * 1000, 30_000),
      reconnectOnError: () => false,
      lazyConnect: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
    } as Record<string, unknown>,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  };
}

/** Call once at startup to silence repeated Redis error logs. */
export function suppressRedisErrorFlood(connection: {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}): void {
  connection.on('error', (err: unknown) => {
    if (!redisErrorLogged) {
      redisErrorLogged = true;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Redis] Connection failed (${message}). ` +
          `Queue features (bulk import, promotions) are disabled. ` +
          `Further Redis errors are suppressed.`,
      );
    }
  });
}
