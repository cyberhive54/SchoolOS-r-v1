import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SectionsService } from '../service';
import { SectionEntity } from '../../../entities/section.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), softDelete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser: AuthUser = { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', role: 'admin', school_id: 's1', membership_id: 'm1' };

describe('SectionsService', () => {
  let service: SectionsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: getRepositoryToken(SectionEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get<SectionsService>(SectionsService);
    repo = module.get(getRepositoryToken(SectionEntity));
  });

  it('should create a section', async () => {
    repo.findOne.mockResolvedValue(null);
    const mock = { id: 's-1', school_id: 's1', name: 'A', created_at: new Date(), updated_at: new Date(), deleted_at: null };
    repo.create.mockReturnValue(mock);
    repo.save.mockResolvedValue(mock);
    const result = await service.create({ name: 'A' }, mockUser);
    expect(result.name).toBe('A');
  });

  it('should throw ConflictException if section name exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing', name: 'A' });
    await expect(service.create({ name: 'A' }, mockUser)).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException for update on missing section', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'B' }, mockUser)).rejects.toThrow(NotFoundException);
  });
});
