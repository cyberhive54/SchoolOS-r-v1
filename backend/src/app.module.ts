import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { z } from 'zod';

import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RoleAwareThrottlerGuard } from './common/guards/role-throttler.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { AuditModule } from './modules/platform/audit/audit.module';
import { PermissionsModule } from './modules/platform/permissions/permissions.module';
import { HealthModule } from './modules/health/health.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { StudentsModule } from './modules/students/students.module';
import { HRModule } from './modules/hr/hr.module';
import { getTypeOrmConfig } from './config/database.config';
import { getRedisConfig } from './config/redis.config';

/** Zod schema for environment variable validation — throws on startup if missing */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('v1'),
  // Support both custom DB vars and Replit's native PG* vars
  DATABASE_HOST: z.string().optional(),
  PGHOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().default(5432),
  PGPORT: z.coerce.number().optional(),
  DATABASE_NAME: z.string().optional(),
  PGDATABASE: z.string().optional(),
  DATABASE_USER: z.string().optional(),
  PGUSER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  DATABASE_SSL_MODE: z.enum(['disable', 'require', 'verify-full']).optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32).default('schoolos_dev_jwt_secret_32chars_minimum_key'),
  JWT_REFRESH_SECRET: z.string().min(32).default('schoolos_dev_refresh_secret_32chars_min'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECURE: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
      }
      return value;
    },
    z.boolean().optional(),
  ),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  PLATFORM_DOMAIN: z.string().default('schoolos.com'),
  EMAIL_PROVIDER: z.enum(['console', 'ses', 'sendgrid', 'mailgun', 'resend']).default('console'),
  EMAIL_FROM: z.string().default('noreply@schoolos.com'),
  SMS_PROVIDER: z.enum(['console', 'msg91']).default('console'),
  STORAGE_PROVIDER: z.enum(['local', 'firebase', 's3']).default('local'),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  MAX_DEVICE_SESSIONS: z.coerce.number().default(3),
});

@Module({
  imports: [
    // ── Config (Zod-validated env) ──────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const result = EnvSchema.safeParse(config);
        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new Error(`Environment validation failed:\n${issues}`);
        }
        return result.data;
      },
    }),

    // ── TypeORM (PostgreSQL) ────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    // ── Rate Limiting (per-role named throttlers) ────────────────────────────
    // Four named throttlers — one per user class.
    // RoleAwareThrottlerGuard selects the correct bucket per request.
    // Test environment uses permissive limits to avoid test flakiness.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get('NODE_ENV') === 'test';
        return {
          throttlers: [
            { name: 'admin',   ttl: 3600 * 1000, limit: isTest ? 1_000_000 : 2000 },
            { name: 'staff',   ttl: 3600 * 1000, limit: isTest ? 1_000_000 : 1000 },
            { name: 'student', ttl: 3600 * 1000, limit: isTest ? 1_000_000 :  500 },
            { name: 'guest',   ttl: 3600 * 1000, limit: isTest ? 1_000_000 :  100 },
          ],
        };
      },
    }),

    // ── Event Emitter (domain events) ────────────────────────────────────────
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // ── BullMQ (job queues) ──────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getRedisConfig,
    }),

    // ── Scheduler (cron jobs) ────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules ──────────────────────────────────────────────────────
    HealthModule,
    AuditModule,
    PermissionsModule,
    UsersModule,
    SchoolsModule,
    AuthModule,
    AcademicsModule,
    StudentsModule,
    HRModule,
  ],
  providers: [
    // ── Global ResponseTransformInterceptor (via DI — Reflector injected) ─
    // Registered here so @SkipTransform() and @PaginatedResponse() decorators
    // (which use Reflector) function correctly for every endpoint.
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    // ── Global JwtAuthGuard ───────────────────────────────────────────────
    // Runs FIRST — populates req.user for authenticated requests.
    // @Public() routes are exempt and req.user is left undefined.
    // Depends on JwtModule (exported by AuthModule) and ConfigService (global).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // ── Global RoleAwareThrottlerGuard ────────────────────────────────────
    // Runs AFTER JwtAuthGuard so req.user (with role) is available.
    // Selects the named throttler bucket matching the authenticated role.
    // Unauthenticated requests (req.user absent) use the 'guest' bucket.
    {
      provide: APP_GUARD,
      useClass: RoleAwareThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply tenant middleware to all routes except health check
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'healthz', method: RequestMethod.GET },
        { path: 'v1/healthz', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
