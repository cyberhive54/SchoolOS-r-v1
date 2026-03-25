import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';

export function getJwtConfig(config: ConfigService): JwtModuleOptions {
  return {
    secret: config.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: (config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m') as StringValue,
      issuer: 'schoolos',
      audience: 'schoolos-api',
    },
  };
}
