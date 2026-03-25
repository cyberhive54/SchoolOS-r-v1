import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserSessionEntity } from '../../entities/user-session.entity';
import { AuditService } from '../../../platform/audit/audit.service';
import type { LogoutResponseDto } from './dto/response.dto';

@Injectable()
export class LogoutService {
  private readonly logger = new Logger(LogoutService.name);

  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepo: Repository<UserSessionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async logout(
    userId: string,
    schoolId: string,
    rawRefreshToken?: string,
    ipAddress?: string,
  ): Promise<LogoutResponseDto> {
    if (rawRefreshToken) {
      const sessions = await this.sessionRepo.find({
        where: { school_id: schoolId, user_id: userId, revoked_at: IsNull() },
        order: { created_at: 'DESC' },
        take: 20,
      });

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(rawRefreshToken, session.refresh_token_hash);
        if (isMatch) {
          session.revoked_at = new Date();
          await this.sessionRepo.save(session);
          break;
        }
      }
    }

    await this.auditService.log({
      school_id: schoolId,
      action: 'LOGOUT',
      resource_type: 'user_session',
      actor_id: userId,
      ip_address: ipAddress,
      metadata: { result: 'success' },
    });

    return { message: 'You have been logged out successfully.' };
  }
}
