import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { LoginService } from './service';
import { LoginRequestDto } from './dto/request.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import type { LoginResponseDto } from './dto/response.dto';

@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  /**
   * POST /v1/auth/login
   * Step 1 of 2FA login — validates credentials, sends OTP.
   * See route.md for full specification.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const schoolId = req.school_id ?? '';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    return this.loginService.login(dto, schoolId, ipAddress);
  }
}
