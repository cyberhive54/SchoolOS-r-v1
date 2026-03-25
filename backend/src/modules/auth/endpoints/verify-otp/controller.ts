import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { VerifyOtpService } from './service';
import { VerifyOtpRequestDto } from './dto/request.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import type { VerifyOtpResponseDto } from './dto/response.dto';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_PATH = '/v1/auth';

@Controller('auth')
export class VerifyOtpController {
  constructor(
    private readonly verifyOtpService: VerifyOtpService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieSecurityOptions(): { secure: boolean; sameSite: 'strict' | 'lax' | 'none' } {
    const sameSite = this.configService.get<'strict' | 'lax' | 'none'>('COOKIE_SAMESITE') ?? 'strict';
    const secureFromEnv = this.configService.get<boolean>('COOKIE_SECURE');
    const secureByDefault = this.configService.get<string>('NODE_ENV') === 'production';
    const secure = sameSite === 'none' ? true : (secureFromEnv ?? secureByDefault);

    return { secure, sameSite };
  }

  /**
   * POST /v1/auth/verify-otp
   * Step 2 of 2FA login: verifies OTP and issues tokens.
   */
  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyOtpResponseDto> {
    const schoolId = req.school_id ?? '';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { response, refreshToken } = await this.verifyOtpService.verifyOtp(
      dto,
      schoolId,
      ipAddress,
      userAgent,
    );

    const cookieSecurity = this.getCookieSecurityOptions();

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: cookieSecurity.secure,
      sameSite: cookieSecurity.sameSite,
      path: REFRESH_TOKEN_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return response;
  }
}
