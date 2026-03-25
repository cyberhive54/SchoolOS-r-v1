import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OtpRequestEntity } from '../../entities/otp-request.entity';
import { UserSessionEntity } from '../../entities/user-session.entity';
import { UsersService } from '../../../users/users.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { VerifyOtpRequestDto } from './dto/request.dto';
import type { VerifyOtpResponseDto } from './dto/response.dto';
import type { JwtPayload } from '@schoolos/types';
import { PLATFORM } from '@schoolos/config';

@Injectable()
export class VerifyOtpService {
  private readonly logger = new Logger(VerifyOtpService.name);

  constructor(
    @InjectRepository(OtpRequestEntity)
    private readonly otpRepo: Repository<OtpRequestEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepo: Repository<UserSessionEntity>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async verifyOtp(
    dto: VerifyOtpRequestDto,
    schoolId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ response: VerifyOtpResponseDto; refreshToken: string }> {
    // Step 1: Find the most recent OTP for this user (regardless of used status)
    const latestOtp = await this.otpRepo.findOne({
      where: {
        school_id: schoolId,
        user_id: dto.user_id,
        purpose: dto.purpose,
      },
      order: { created_at: 'DESC' },
    });

    if (!latestOtp) {
      throw new NotFoundException({
        error: {
          code: 'OTP_NOT_FOUND',
          message: 'No OTP found for this request. Please request a new OTP.',
        },
      });
    }

    // Step 1a: Check if OTP was already used — distinct error for UX clarity
    if (latestOtp.used_at !== null) {
      throw new UnauthorizedException({
        error: {
          code: 'OTP_USED',
          message: 'This OTP has already been used. Please request a new OTP.',
        },
      });
    }

    const otpRequest = latestOtp;

    // Step 2: Check if locked out
    if (otpRequest.locked_until && otpRequest.locked_until > new Date()) {
      const remainingMs = otpRequest.locked_until.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new HttpException(
        {
          error: {
            code: 'OTP_LOCKED',
            message: `Too many incorrect attempts. Please wait ${remainingMin} minute(s) and try again.`,
            details: {
              locked_until: otpRequest.locked_until.toISOString(),
              remaining_minutes: remainingMin,
            },
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Step 3: Check expiry
    if (otpRequest.expires_at < new Date()) {
      throw new UnauthorizedException({
        error: {
          code: 'OTP_EXPIRED',
          message: 'The OTP has expired. Please request a new one.',
        },
      });
    }

    // Step 4: Verify OTP against hash
    const isValid = await bcrypt.compare(dto.otp, otpRequest.otp_hash);
    if (!isValid) {
      otpRequest.attempt_count += 1;

      if (otpRequest.attempt_count >= PLATFORM.OTP_MAX_ATTEMPTS) {
        otpRequest.locked_until = new Date(
          Date.now() + PLATFORM.OTP_LOCKOUT_MINUTES * 60 * 1000,
        );
        await this.auditService.log({
          school_id: schoolId,
          action: 'OTP_LOCKED',
          resource_type: 'otp_request',
          resource_id: otpRequest.id,
          actor_id: dto.user_id,
          ip_address: ipAddress,
          metadata: { attempt_count: otpRequest.attempt_count },
        });
      }

      await this.otpRepo.save(otpRequest);

      throw new UnauthorizedException({
        error: {
          code: 'OTP_INVALID',
          message: 'The OTP you entered is incorrect.',
          details: {
            attempts_remaining: Math.max(
              0,
              PLATFORM.OTP_MAX_ATTEMPTS - otpRequest.attempt_count,
            ),
          },
        },
      });
    }

    // Step 5: Mark OTP as used
    otpRequest.used_at = new Date();
    await this.otpRepo.save(otpRequest);

    // Step 6: Get user + membership
    const user = await this.usersService.findById(dto.user_id);
    const membership = await this.usersService.findMembership(schoolId, user.id);

    if (!membership) {
      throw new UnauthorizedException({
        error: {
          code: 'USER_NOT_IN_SCHOOL',
          message: 'You do not have access to this school.',
        },
      });
    }

    // Step 7: Generate JWT access token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      school_id: schoolId,
      role: membership.role,
      membership_id: membership.id,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload);
    const expiresIn = 900;

    // Step 8: Generate refresh token and store its hash
    const refreshToken = uuidv4() + uuidv4().replace(/-/g, '');
    const bcryptRounds =
      this.configService.get<number>('BCRYPT_ROUNDS') ?? PLATFORM.BCRYPT_ROUNDS;
    const refreshTokenHash = await bcrypt.hash(refreshToken, bcryptRounds);

    const session = this.sessionRepo.create({
      school_id: schoolId,
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      device_info: userAgent ?? null,
      ip_address: ipAddress ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked_at: null,
    });
    await this.sessionRepo.save(session);

    // Enforce max device sessions
    await this.enforceMaxSessions(schoolId, user.id);

    await this.auditService.log({
      school_id: schoolId,
      action: 'LOGIN',
      resource_type: 'user_session',
      resource_id: session.id,
      actor_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { result: 'success', role: membership.role },
    });

    return {
      response: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: membership.role,
        },
      },
      refreshToken,
    };
  }

  private async enforceMaxSessions(schoolId: string, userId: string): Promise<void> {
    const maxSessions =
      this.configService.get<number>('MAX_DEVICE_SESSIONS') ?? PLATFORM.MAX_DEVICE_SESSIONS;

    const sessions = await this.sessionRepo.find({
      where: { school_id: schoolId, user_id: userId, revoked_at: IsNull() },
      order: { created_at: 'ASC' },
    });

    const activeSessions = sessions.filter((s) => s.expires_at > new Date());

    if (activeSessions.length > maxSessions) {
      const toRevoke = activeSessions.slice(0, activeSessions.length - maxSessions);
      for (const session of toRevoke) {
        session.revoked_at = new Date();
        await this.sessionRepo.save(session);
      }
    }
  }
}
