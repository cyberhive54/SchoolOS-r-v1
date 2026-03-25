import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { VerifyOtpService } from '../service';
import { OtpRequestEntity } from '../../../entities/otp-request.entity';
import { UserSessionEntity } from '../../../entities/user-session.entity';
import { UsersService } from '../../../../users/users.service';
import { AuditService } from '../../../../platform/audit/audit.service';

const OTP = '123456';
const OTP_HASH = bcrypt.hashSync(OTP, 10);

const mockOtpRequest = {
  id: 'otp-uuid-1',
  school_id: 'school-uuid-1',
  user_id: 'user-uuid-1',
  purpose: '2fa_login',
  otp_hash: OTP_HASH,
  expires_at: new Date(Date.now() + 10 * 60 * 1000),
  used_at: null,
  attempt_count: 0,
  locked_until: null,
};

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@demo.schoolos.com',
  first_name: 'Admin',
  last_name: 'User',
  is_active: true,
  created_at: new Date(),
};

const mockMembership = {
  id: 'membership-uuid-1',
  school_id: 'school-uuid-1',
  user_id: 'user-uuid-1',
  role: 'super_admin',
  is_active: true,
};

const mockOtpRepo = {
  findOne: jest.fn().mockResolvedValue(mockOtpRequest),
  save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn().mockImplementation((x: unknown) => x),
};

const mockSessionRepo = {
  create: jest.fn().mockImplementation((x: Partial<UserSessionEntity>) => ({ id: 'session-uuid-1', ...x })),
  save: jest.fn().mockImplementation((x: Partial<UserSessionEntity>) => Promise.resolve(x)),
  find: jest.fn().mockResolvedValue([]),
};

const mockUsersService = {
  findById: jest.fn().mockResolvedValue(mockUser),
  findMembership: jest.fn().mockResolvedValue(mockMembership),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, unknown> = {
      BCRYPT_ROUNDS: 10,
      MAX_DEVICE_SESSIONS: 3,
    };
    return config[key];
  }),
};

describe('VerifyOtpService', () => {
  let service: VerifyOtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyOtpService,
        { provide: getRepositoryToken(OtpRequestEntity), useValue: mockOtpRepo },
        { provide: getRepositoryToken(UserSessionEntity), useValue: mockSessionRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<VerifyOtpService>(VerifyOtpService);
    jest.clearAllMocks();
  });

  const dto = {
    user_id: 'user-uuid-1',
    otp: OTP,
    purpose: '2fa_login' as const,
  };
  const schoolId = 'school-uuid-1';

  describe('verifyOtp()', () => {
    it('should return access token and refresh token on valid OTP', async () => {
      mockOtpRepo.findOne.mockResolvedValue({ ...mockOtpRequest });
      const result = await service.verifyOtp(dto, schoolId);
      expect(result.response.access_token).toBe('mock.jwt.token');
      expect(result.response.token_type).toBe('Bearer');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw OTP_NOT_FOUND when no pending OTP exists', async () => {
      mockOtpRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyOtp(dto, schoolId)).rejects.toThrow(NotFoundException);
    });

    it('should throw OTP_EXPIRED when OTP is past expiry', async () => {
      mockOtpRepo.findOne.mockResolvedValue({
        ...mockOtpRequest,
        expires_at: new Date(Date.now() - 1000),
      });
      await expect(service.verifyOtp(dto, schoolId)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw OTP_USED when OTP was already used', async () => {
      mockOtpRepo.findOne.mockResolvedValue({
        ...mockOtpRequest,
        used_at: new Date(Date.now() - 5000),
      });
      await expect(service.verifyOtp(dto, schoolId)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw OTP_INVALID for wrong OTP and increment attempt_count', async () => {
      const otp = { ...mockOtpRequest };
      mockOtpRepo.findOne.mockResolvedValue(otp);
      await expect(
        service.verifyOtp({ ...dto, otp: '000000' }, schoolId),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockOtpRepo.save).toHaveBeenCalled();
    });

    it('should lock OTP after max failed attempts', async () => {
      const otp = { ...mockOtpRequest, attempt_count: 4 }; // one more = 5 = max
      mockOtpRepo.findOne.mockResolvedValue(otp);
      await expect(
        service.verifyOtp({ ...dto, otp: '000000' }, schoolId),
      ).rejects.toThrow(UnauthorizedException);
      expect(otp.locked_until).not.toBeNull();
    });

    it('should throw OTP_LOCKED when account is locked', async () => {
      mockOtpRepo.findOne.mockResolvedValue({
        ...mockOtpRequest,
        locked_until: new Date(Date.now() + 10 * 60 * 1000),
      });
      await expect(service.verifyOtp(dto, schoolId)).rejects.toThrow();
    });
  });
});
