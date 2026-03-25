import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectsService } from '../service';
import { SubjectEntity } from '../../../entities/subject.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), softDelete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser: AuthUser = { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', role: 'admin', school_id: 's1', membership_id: 'm1' };

describe('SubjectsService', () => {
  let service: SubjectsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getRepositoryToken(SubjectEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get<SubjectsService>(SubjectsService);
    repo = module.get(getRepositoryToken(SubjectEntity));
  });

  it('should create a subject', async () => {
    repo.findOne.mockResolvedValue(null);
    const mock = { id: 's-1', school_id: 's1', name: 'Mathematics', code: 'MATH', type: 'core', created_at: new Date(), updated_at: new Date(), deleted_at: null };
    repo.create.mockReturnValue(mock);
    repo.save.mockResolvedValue(mock);
    const result = await service.create({ name: 'Mathematics', code: 'MATH' }, mockUser);
    expect(result.code).toBe('MATH');
  });

  it('should uppercase the subject code', async () => {
    repo.findOne.mockResolvedValue(null);
    const mock = { id: 's-1', school_id: 's1', name: 'Math', code: 'MATH', type: 'core', created_at: new Date(), updated_at: new Date(), deleted_at: null };
    repo.create.mockReturnValue(mock);
    repo.save.mockResolvedValue(mock);
    await service.create({ name: 'Math', code: 'math' }, mockUser);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'MATH' }));
  });

  it('should throw ConflictException if code already exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing', code: 'MATH' });
    await expect(service.create({ name: 'Math', code: 'MATH' }, mockUser)).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException for missing subject', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 's1')).rejects.toThrow(NotFoundException);
  });
});
