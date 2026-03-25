import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RefreshService } from '../service';
import { UserSessionEntity } from '../../../entities/user-session.entity';
import { UsersService } from '../../../../users/users.service';
import { AuditService } from '../../../../platform/audit/audit.service';

const RAW_TOKEN = 'test-refresh-token-abc123';
const TOKEN_HASH = bcrypt.hashSync(RAW_TOKEN, 10);

const makeSession = (overrides: Partial<UserSessionEntity> = {}): UserSessionEntity =>
  ({
    id: 'session-uuid-1',
    school_id: 'school-uuid-1',
    user_id: 'user-uuid-1',
    refresh_token_hash: TOKEN_HASH,
    device_info: null,
    ip_address: null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked_at: null,
    created_at: new Date(),
    ...overrides,
  } as UserSessionEntity);

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@demo.schoolos.com',
  first_name: 'Admin',
  last_name: 'User',
};
const mockMembership = { id: 'membership-uuid-1', role: 'super_admin' };

const mockSessionRepo = {
  find: jest.fn().mockResolvedValue([makeSession()]),
  create: jest.fn().mockImplementation((x: Partial<UserSessionEntity>) => ({ id: 'new-session-uuid', ...x })),
  save: jest.fn().mockImplementation((x: Partial<UserSessionEntity>) => Promise.resolve(x)),
};

describe('RefreshService', () => {
  let service: RefreshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshService,
        { provide: getRepositoryToken(UserSessionEntity), useValue: mockSessionRepo },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockUser),
            findMembership: jest.fn().mockResolvedValue(mockMembership),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('new.jwt.token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<RefreshService>(RefreshService);
    jest.clearAllMocks();
  });

  it('should rotate refresh token and return new access token', async () => {
    mockSessionRepo.find.mockResolvedValue([makeSession()]);
    const result = await service.refresh(RAW_TOKEN, 'school-uuid-1');
    expect(result.response.access_token).toBe('new.jwt.token');
    expect(result.newRefreshToken).toBeDefined();
    // Old session revoked + new session saved
    expect(mockSessionRepo.save).toHaveBeenCalledTimes(2);
  });

  it('should throw SESSION_NOT_FOUND for invalid token', async () => {
    mockSessionRepo.find.mockResolvedValue([makeSession()]);
    await expect(service.refresh('wrong-token', 'school-uuid-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw SESSION_NOT_FOUND for expired session', async () => {
    const expiredSession = makeSession({ expires_at: new Date(Date.now() - 1000) });
    mockSessionRepo.find.mockResolvedValue([expiredSession]);
    await expect(service.refresh(RAW_TOKEN, 'school-uuid-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
