import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RefreshService } from './service';
import { Public } from '../../../../common/decorators/public.decorator';
import type { RefreshResponseDto } from './dto/response.dto';

@Controller('auth')
export class RefreshController {
  constructor(
    private readonly refreshService: RefreshService,
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
   * POST /v1/auth/refresh
   * Rotates refresh token and issues a new access token.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedException({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'No refresh token provided.',
        },
      });
    }

    const schoolId = req.school_id ?? '';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { response, newRefreshToken } = await this.refreshService.refresh(
      rawRefreshToken,
      schoolId,
      ipAddress,
      userAgent,
    );

    const cookieSecurity = this.getCookieSecurityOptions();

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: cookieSecurity.secure,
      sameSite: cookieSecurity.sameSite,
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return response;
  }
}
