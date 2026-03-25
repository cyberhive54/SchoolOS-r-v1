import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectGroupsService } from '../service';
import { SubjectGroupEntity } from '../../../entities/subject-group.entity';
import { SubjectGroupItemEntity } from '../../../entities/subject-group-item.entity';
import { SubjectEntity } from '../../../entities/subject.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser: AuthUser = { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', role: 'admin', school_id: 's1', membership_id: 'm1' };

describe('SubjectGroupsService', () => {
  let service: SubjectGroupsService;
  let groupRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectGroupsService,
        { provide: getRepositoryToken(SubjectGroupEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SubjectGroupItemEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SubjectEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get<SubjectGroupsService>(SubjectGroupsService);
    groupRepo = module.get(getRepositoryToken(SubjectGroupEntity));
  });

  it('should throw ConflictException if group name exists', async () => {
    groupRepo.findOne.mockResolvedValue({ id: 'existing', name: 'Science' });
    await expect(service.create({ name: 'Science' }, mockUser)).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException for missing group', async () => {
    groupRepo.findOne.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'Arts' }, mockUser)).rejects.toThrow(NotFoundException);
  });
});
