import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TimetableSlotsService } from '../service';
import { TimetableSlotEntity } from '../../../entities/timetable-slot.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo  = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('TimetableSlotsService', () => {
  let service: TimetableSlotsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableSlotsService,
        { provide: getRepositoryToken(TimetableSlotEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(TimetableSlotsService);
    repo    = module.get(getRepositoryToken(TimetableSlotEntity));
  });

  describe('create', () => {
    const dto = {
      academic_year_id: 'year-1',
      class_section_id: 'cs-1',
      timetable_period_id: 'period-1',
      day_of_week: 1,
    };

    it('creates a slot successfully', async () => {
      repo.findOne.mockResolvedValue(null);
      const entity = { ...dto, id: 's-1', school_id: 'school-1', subject_id: null, staff_id: null, is_free_period: false, effective_from: null, effective_to: null, created_at: new Date(), updated_at: new Date() };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto, mockUser);
      expect(result.day_of_week).toBe(1);
    });

    it('throws ConflictException when slot already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if slot not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });
});
