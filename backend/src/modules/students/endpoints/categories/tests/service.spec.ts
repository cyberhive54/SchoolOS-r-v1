import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../service';
import { StudentCategoryEntity } from '../../../entities/student-category.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});
const mockAudit = () => ({ log: jest.fn() });

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: ReturnType<typeof mockRepo>;

  const user = { id: 'u1', school_id: 'school1', role: 'admin', email: 'a@b.com' } as never;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(StudentCategoryEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(CategoriesService);
    repo = module.get(getRepositoryToken(StudentCategoryEntity));
  });

  describe('create', () => {
    it('creates a category successfully', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ id: 'c1', name: 'General', code: 'GEN', school_id: 'school1' });
      repo.save.mockResolvedValue({ id: 'c1', name: 'General', code: 'GEN', school_id: 'school1' });
      const result = await service.create({ name: 'General', code: 'GEN' }, user);
      expect(result.id).toBe('c1');
    });

    it('throws ConflictException when code already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create({ name: 'General', code: 'GEN' }, user)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns all categories for school', async () => {
      repo.find.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      const result = await service.findAll('school1');
      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when category not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('missing', user)).rejects.toThrow(NotFoundException);
    });
  });
});
