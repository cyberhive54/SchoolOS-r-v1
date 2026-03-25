import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OtpRequestEntity } from '../../entities/otp-request.entity';
import { UsersService } from '../../../users/users.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { LoginRequestDto } from './dto/request.dto';
import type { LoginResponseDto } from './dto/response.dto';
import { PLATFORM } from '@schoolos/config';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    @InjectRepository(OtpRequestEntity)
    private readonly otpRepo: Repository<OtpRequestEntity>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginRequestDto,
    schoolId: string,
    ipAddress?: string,
  ): Promise<LoginResponseDto> {
    // Step 1: Find user by identifier
    const user = await this.resolveUser(dto.identifier, dto.identifier_type);

    if (!user || !user.is_active) {
      await this.auditService.log({
        school_id: schoolId,
        action: 'LOGIN',
        resource_type: 'user',
        ip_address: ipAddress,
        metadata: {
          result: 'failed',
          reason: user ? 'account_disabled' : 'user_not_found',
          identifier_type: dto.identifier_type,
        },
      });
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'The email or password you entered is incorrect.',
        },
      });
    }

    // Step 2: Verify user is a member of this school
    const membership = await this.usersService.findMembership(schoolId, user.id);
    if (!membership) {
      throw new ForbiddenException({
        error: {
          code: 'USER_NOT_IN_SCHOOL',
          message: 'You do not have access to this school.',
        },
      });
    }

    // Step 3: Verify password (bcrypt)
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      await this.auditService.log({
        school_id: schoolId,
        action: 'LOGIN',
        resource_type: 'user',
        resource_id: user.id,
        actor_id: user.id,
        ip_address: ipAddress,
        metadata: { result: 'failed', reason: 'invalid_password' },
      });
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'The email or password you entered is incorrect.',
        },
      });
    }

    // Step 4: Check OTP rate limit (max 3 per 10 min per account)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpCount = await this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.school_id = :schoolId', { schoolId })
      .andWhere('otp.user_id = :userId', { userId: user.id })
      .andWhere("otp.purpose = '2fa_login'")
      .andWhere('otp.created_at > :since', { since: tenMinutesAgo })
      .getCount();

    if (recentOtpCount >= PLATFORM.OTP_RATE_LIMIT_PER_10MIN) {
      throw new HttpException(
        {
          error: {
            code: 'OTP_RATE_LIMITED',
            message: `Too many OTP requests. Please wait 10 minutes before trying again.`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Step 5: Generate 6-digit OTP and hash it
    const otp = this.generateOtp();
    const otpExpiryMinutes =
      this.configService.get<number>('OTP_EXPIRY_MINUTES') ?? PLATFORM.OTP_EXPIRY_MINUTES;
    const bcryptRounds =
      this.configService.get<number>('BCRYPT_ROUNDS') ?? PLATFORM.BCRYPT_ROUNDS;

    const otpHash = await bcrypt.hash(otp, bcryptRounds);

    const otpRequest = this.otpRepo.create({
      school_id: schoolId,
      user_id: user.id,
      channel: 'email',
      otp_hash: otpHash,
      purpose: '2fa_login',
      expires_at: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
      used_at: null,
      attempt_count: 0,
      locked_until: null,
      ip_address: ipAddress ?? null,
    });
    await this.otpRepo.save(otpRequest);

    // Step 6: Send OTP (dev: log to console; production: real email)
    await this.sendOtp(user.email, otp);

    await this.auditService.log({
      school_id: schoolId,
      action: 'LOGIN',
      resource_type: 'otp_request',
      resource_id: otpRequest.id,
      actor_id: user.id,
      ip_address: ipAddress,
      metadata: { result: 'otp_sent', channel: 'email', purpose: '2fa_login' },
    });

    return {
      message: 'OTP sent to your registered email.',
      otp_sent: true,
      user_id: user.id,
      channel: 'email',
    };
  }

  private async resolveUser(identifier: string, _identifierType: string) {
    // For Phase 1: only email-based lookup
    // Phase 2 will add phone, student_id, staff_id, etc.
    return this.usersService.findByEmail(identifier);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtp(email: string, otp: string): Promise<void> {
    const provider = this.configService.get<string>('EMAIL_PROVIDER') ?? 'console';

    if (provider === 'console') {
      this.logger.log(`═════════════════════════════════`);
      this.logger.log(`  DEV OTP for ${email}: ${otp}`);
      this.logger.log(`  Expires in ${PLATFORM.OTP_EXPIRY_MINUTES} minutes`);
      this.logger.log(`═════════════════════════════════`);
      return;
    }

    // Real providers wired up in Phase 2 via notification engine
    this.logger.warn(`Email provider '${provider}' not yet implemented. OTP: ${otp}`);
  }
}
