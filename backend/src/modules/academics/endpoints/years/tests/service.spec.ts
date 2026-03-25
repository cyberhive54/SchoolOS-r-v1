import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { YearsService } from '../service';
import { AcademicYearEntity } from '../../../entities/academic-year.entity';
import { ClassSectionEntity } from '../../../entities/class-section.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  }),
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

describe('YearsService', () => {
  let service: YearsService;
  let yearRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YearsService,
        { provide: getRepositoryToken(AcademicYearEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();

    service = module.get<YearsService>(YearsService);
    yearRepo = module.get(getRepositoryToken(AcademicYearEntity));
  });

  describe('create', () => {
    it('should create an academic year', async () => {
      yearRepo.findOne.mockResolvedValue(null);
      const mockYear = { id: 'y-1', school_id: 'school-1', name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, created_at: new Date(), updated_at: new Date() };
      yearRepo.create.mockReturnValue(mockYear);
      yearRepo.save.mockResolvedValue(mockYear);

      const result = await service.create({ name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31' }, mockUser);
      expect(result.name).toBe('2025-26');
      expect(yearRepo.create).toHaveBeenCalledWith(expect.objectContaining({ school_id: 'school-1', name: '2025-26' }));
    });

    it('should throw ConflictException if name already exists', async () => {
      yearRepo.findOne.mockResolvedValue({ id: 'existing', name: '2025-26' });
      await expect(service.create({ name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31' }, mockUser))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if year not found', async () => {
      yearRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCurrent', () => {
    it('should set a year as current', async () => {
      const mockYear = { id: 'y-1', school_id: 'school-1', name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, created_at: new Date(), updated_at: new Date() };
      yearRepo.findOne.mockResolvedValue(mockYear);
      yearRepo.save.mockResolvedValue({ ...mockYear, is_current: true });

      const result = await service.setCurrent('y-1', mockUser);
      expect(result.is_current).toBe(true);
    });
  });
});
