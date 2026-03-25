import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClassesService } from '../service';
import { ClassEntity } from '../../../entities/class.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
});

const mockAudit = () => ({ log: jest.fn() });

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'admin@demo.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  school_id: 'school-1',
  membership_id: 'mem-1',
};

describe('ClassesService', () => {
  let service: ClassesService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: getRepositoryToken(ClassEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    repo = module.get(getRepositoryToken(ClassEntity));
  });

  it('should create a class', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.count.mockResolvedValue(0);
    const mockClass = { id: 'c-1', school_id: 'school-1', name: 'Grade 1', order_index: 0, created_at: new Date(), updated_at: new Date(), deleted_at: null };
    repo.create.mockReturnValue(mockClass);
    repo.save.mockResolvedValue(mockClass);

    const result = await service.create({ name: 'Grade 1' }, mockUser);
    expect(result.name).toBe('Grade 1');
  });

  it('should throw ConflictException if class name exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing', name: 'Grade 1' });
    await expect(service.create({ name: 'Grade 1' }, mockUser)).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException for missing class', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });
});
