import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserSessionEntity } from '../../entities/user-session.entity';
import { UsersService } from '../../../users/users.service';
import { AuditService } from '../../../platform/audit/audit.service';
import type { RefreshResponseDto } from './dto/response.dto';
import type { JwtPayload } from '@schoolos/types';
import { PLATFORM } from '@schoolos/config';

@Injectable()
export class RefreshService {
  private readonly logger = new Logger(RefreshService.name);

  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepo: Repository<UserSessionEntity>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async refresh(
    rawRefreshToken: string,
    schoolId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ response: RefreshResponseDto; newRefreshToken: string }> {
    // Find all non-revoked sessions for this school (limit search space)
    const sessions = await this.sessionRepo.find({
      where: { school_id: schoolId, revoked_at: IsNull() },
      order: { created_at: 'DESC' },
      take: 50,
    });

    let matchedSession: UserSessionEntity | null = null;

    for (const session of sessions) {
      if (session.expires_at < new Date()) continue;
      const isMatch = await bcrypt.compare(rawRefreshToken, session.refresh_token_hash);
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException({
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Invalid or expired session. Please log in again.',
        },
      });
    }

    // Revoke old session (rotation)
    matchedSession.revoked_at = new Date();
    await this.sessionRepo.save(matchedSession);

    // Get user + membership
    const user = await this.usersService.findById(matchedSession.user_id);
    const membership = await this.usersService.findMembership(schoolId, user.id);

    if (!membership) {
      throw new UnauthorizedException({
        error: {
          code: 'SESSION_REVOKED',
          message: 'Your session is no longer valid. Please log in again.',
        },
      });
    }

    // Issue new access token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      school_id: schoolId,
      role: membership.role,
      membership_id: membership.id,
    };
    const accessToken = await this.jwtService.signAsync(jwtPayload);

    // Issue new refresh token (rotation)
    const newRefreshToken = uuidv4() + uuidv4().replace(/-/g, '');
    const bcryptRounds =
      this.configService.get<number>('BCRYPT_ROUNDS') ?? PLATFORM.BCRYPT_ROUNDS;
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, bcryptRounds);

    const newSession = this.sessionRepo.create({
      school_id: schoolId,
      user_id: user.id,
      refresh_token_hash: newRefreshTokenHash,
      device_info: userAgent ?? matchedSession.device_info,
      ip_address: ipAddress ?? matchedSession.ip_address,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked_at: null,
    });
    await this.sessionRepo.save(newSession);

    await this.auditService.log({
      school_id: schoolId,
      action: 'SESSION_REVOKED',
      resource_type: 'user_session',
      resource_id: matchedSession.id,
      actor_id: user.id,
      ip_address: ipAddress,
      metadata: { reason: 'token_rotation', new_session_id: newSession.id },
    });

    return {
      response: { access_token: accessToken, token_type: 'Bearer', expires_in: 900 },
      newRefreshToken,
    };
  }
}
