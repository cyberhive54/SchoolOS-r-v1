import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { UserSessionEntity } from './entities/user-session.entity';
import { OtpRequestEntity } from './entities/otp-request.entity';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';

import { LoginController } from './endpoints/login/controller';
import { LoginService } from './endpoints/login/service';
import { VerifyOtpController } from './endpoints/verify-otp/controller';
import { VerifyOtpService } from './endpoints/verify-otp/service';
import { RefreshController } from './endpoints/refresh/controller';
import { RefreshService } from './endpoints/refresh/service';
import { LogoutController } from './endpoints/logout/controller';
import { LogoutService } from './endpoints/logout/service';

@Module({
  imports: [
    UsersModule,
    SchoolsModule,
    TypeOrmModule.forFeature([UserSessionEntity, OtpRequestEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m') as StringValue,
          issuer: 'schoolos',
          audience: 'schoolos-api',
        },
      }),
    }),
  ],
  controllers: [
    LoginController,
    VerifyOtpController,
    RefreshController,
    LogoutController,
  ],
  providers: [
    LoginService,
    VerifyOtpService,
    RefreshService,
    LogoutService,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
