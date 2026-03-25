import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Bootstraps the SchoolOS NestJS API.
 *
 * Note on global providers:
 *   - AllExceptionsFilter: registered via useGlobalFilters (no DI needed)
 *   - ResponseTransformInterceptor: registered via APP_INTERCEPTOR in AppModule
 *     so that Reflector is injected correctly and @SkipTransform() works
 *   - ThrottlerGuard: registered via APP_GUARD in AppModule
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'verbose', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT') ?? 4000;
  const corsOrigins = configService.get<string>('CORS_ORIGINS') ?? '';

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── Compression ──────────────────────────────────────────────────────────
  app.use(compression());

  // ── Cookie parser (required for refresh token cookie) ────────────────────
  app.use(cookieParser());

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-School-ID',
      'X-CSRF-Token',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-ID'],
  });

  // ── API versioning ───────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });

  // ── Global prefix ────────────────────────────────────────────────────────
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'v1';
  app.setGlobalPrefix(apiPrefix);

  // ── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── Global exception filter (no DI needed — registered here) ────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Note: ResponseTransformInterceptor and ThrottlerGuard are registered
  //         in AppModule via APP_INTERCEPTOR / APP_GUARD for proper DI ─────

  await app.listen(port, '0.0.0.0');
  console.log(`SchoolOS API listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

void bootstrap();
