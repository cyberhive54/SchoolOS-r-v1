import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload, AuthUser } from '@schoolos/types';

/**
 * JwtAuthGuard — verifies the Bearer token and populates req.user.
 *
 * Registered globally via APP_GUARD in AppModule.
 * Endpoints decorated with @Public() are exempt from authentication.
 *
 * Depends on:
 *   - JwtModule (exported by AuthModule — imported in AppModule)
 *   - ConfigService (global — registered in AppModule)
 *   - Reflector (always available in the root context)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() endpoints through without a token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required.',
        },
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      request.user = {
        id: payload.sub,
        email: '',
        first_name: '',
        last_name: '',
        role: payload.role,
        school_id: payload.school_id,
        membership_id: payload.membership_id,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_TOKEN',
          message: 'The provided authentication token is invalid or expired.',
        },
      });
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
