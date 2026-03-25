import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginService } from '../service';
import { OtpRequestEntity } from '../../../entities/otp-request.entity';
import { UsersService } from '../../../../users/users.service';
import { AuditService } from '../../../../platform/audit/audit.service';
import { PLATFORM } from '@schoolos/config';

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@demo.schoolos.com',
  first_name: 'Admin',
  last_name: 'User',
  password_hash: bcrypt.hashSync('Admin@123', 10),
  is_active: true,
};

const mockMembership = {
  id: 'membership-uuid-1',
  school_id: 'school-uuid-1',
  user_id: 'user-uuid-1',
  role: 'super_admin',
  is_active: true,
};

/** Builder mock — mirrors SelectQueryBuilder chaining used in LoginService */
const makeQueryBuilderMock = (countResult: number) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(countResult),
});

const mockOtpRepo = {
  createQueryBuilder: jest.fn(),
  create: jest.fn().mockImplementation((dto: unknown) => dto),
  save: jest.fn().mockResolvedValue({ id: 'otp-uuid-1' }),
};

const mockUsersService = {
  findByEmail: jest.fn().mockResolvedValue(mockUser),
  findMembership: jest.fn().mockResolvedValue(mockMembership),
};

const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const cfg: Record<string, unknown> = {
      OTP_EXPIRY_MINUTES: 10,
      BCRYPT_ROUNDS: 10,
      EMAIL_PROVIDER: 'console',
    };
    return cfg[key];
  }),
};

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: getRepositoryToken(OtpRequestEntity), useValue: mockOtpRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
    jest.clearAllMocks();

    // Default: no recent OTPs
    mockOtpRepo.createQueryBuilder.mockReturnValue(makeQueryBuilderMock(0));
  });

  const dto = {
    identifier: 'admin@demo.schoolos.com',
    identifier_type: 'email' as const,
    password: 'Admin@123',
  };
  const schoolId = 'school-uuid-1';

  it('should return otp_sent=true on valid credentials', async () => {
    mockUsersService.findByEmail.mockResolvedValue(mockUser);
    mockUsersService.findMembership.mockResolvedValue(mockMembership);

    const result = await service.login(dto, schoolId);

    expect(result.otp_sent).toBe(true);
    expect(result.user_id).toBe(mockUser.id);
    expect(result.channel).toBe('email');
    expect(mockOtpRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should throw INVALID_CREDENTIALS when user does not exist', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);

    await expect(service.login(dto, schoolId)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
    mockUsersService.findByEmail.mockResolvedValue(mockUser);
    mockUsersService.findMembership.mockResolvedValue(mockMembership);

    const badDto = { ...dto, password: 'WrongPassword' };
    await expect(service.login(badDto, schoolId)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw INVALID_CREDENTIALS when user is inactive', async () => {
    mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, is_active: false });

    await expect(service.login(dto, schoolId)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw USER_NOT_IN_SCHOOL when user has no membership', async () => {
    mockUsersService.findByEmail.mockResolvedValue(mockUser);
    mockUsersService.findMembership.mockResolvedValue(null);

    await expect(service.login(dto, schoolId)).rejects.toThrow(ForbiddenException);
  });

  it('should throw OTP_RATE_LIMITED when too many OTPs requested', async () => {
    mockUsersService.findByEmail.mockResolvedValue(mockUser);
    mockUsersService.findMembership.mockResolvedValue(mockMembership);
    // At or above limit
    mockOtpRepo.createQueryBuilder.mockReturnValue(
      makeQueryBuilderMock(PLATFORM.OTP_RATE_LIMIT_PER_10MIN),
    );

    await expect(service.login(dto, schoolId)).rejects.toThrow(HttpException);
  });
});
