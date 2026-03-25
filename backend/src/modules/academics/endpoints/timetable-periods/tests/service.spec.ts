import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TimetablePeriodsService } from '../service';
import { TimetablePeriodEntity } from '../../../entities/timetable-period.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('TimetablePeriodsService', () => {
  let service: TimetablePeriodsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetablePeriodsService,
        { provide: getRepositoryToken(TimetablePeriodEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();

    service = module.get(TimetablePeriodsService);
    repo    = module.get(getRepositoryToken(TimetablePeriodEntity));
  });

  describe('create', () => {
    const dto = {
      academic_year_id: 'year-1',
      name: 'Period 1',
      period_number: 1,
      start_time: '08:00',
      end_time: '08:45',
    };

    it('creates a period and returns DTO', async () => {
      repo.findOne.mockResolvedValue(null);
      const entity = { ...dto, id: 'p-1', school_id: 'school-1', is_break: false, is_active: true, created_at: new Date(), updated_at: new Date() };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto, mockUser);
      expect(result.name).toBe('Period 1');
      expect(result.period_number).toBe(1);
    });

    it('throws ConflictException if period_number already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if start_time >= end_time', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.create({ ...dto, start_time: '09:00', end_time: '08:00' }, mockUser))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });
});
