import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LogoutService } from './service';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { AuthUser } from '@schoolos/types';
import type { LogoutResponseDto } from './dto/response.dto';

@Controller('auth')
export class LogoutController {
  constructor(
    private readonly logoutService: LogoutService,
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
   * POST /v1/auth/logout
   * Revokes current session and clears refresh token cookie.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    const ipAddress = req.ip ?? req.socket?.remoteAddress;

    const result = await this.logoutService.logout(
      user.id,
      user.school_id,
      rawRefreshToken,
      ipAddress,
    );

    const cookieSecurity = this.getCookieSecurityOptions();

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: cookieSecurity.secure,
      sameSite: cookieSecurity.sameSite,
      path: '/v1/auth',
    });

    return result;
  }
}
