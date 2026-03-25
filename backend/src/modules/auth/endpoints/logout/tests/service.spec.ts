import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LogoutService } from '../service';
import { UserSessionEntity } from '../../../entities/user-session.entity';
import { AuditService } from '../../../../platform/audit/audit.service';

const RAW_TOKEN = 'test-refresh-token';
const TOKEN_HASH = bcrypt.hashSync(RAW_TOKEN, 10);

describe('LogoutService', () => {
  let service: LogoutService;

  const mockSessionRepo = {
    find: jest.fn().mockResolvedValue([
      { id: 'session-1', refresh_token_hash: TOKEN_HASH, revoked_at: null },
    ]),
    save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutService,
        { provide: getRepositoryToken(UserSessionEntity), useValue: mockSessionRepo },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<LogoutService>(LogoutService);
    jest.clearAllMocks();
  });

  it('should revoke the session matching the refresh token', async () => {
    const session = { id: 'session-1', refresh_token_hash: TOKEN_HASH, revoked_at: null };
    mockSessionRepo.find.mockResolvedValue([session]);

    const result = await service.logout('user-1', 'school-1', RAW_TOKEN);
    expect(result.message).toContain('logged out');
    expect(mockSessionRepo.save).toHaveBeenCalled();
  });

  it('should still return success even with no refresh token', async () => {
    const result = await service.logout('user-1', 'school-1', undefined);
    expect(result.message).toContain('logged out');
  });
});
