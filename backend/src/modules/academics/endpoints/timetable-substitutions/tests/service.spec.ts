import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TimetableSubstitutionsService } from '../service';
import { TimetableSubstitutionEntity } from '../../../entities/timetable-substitution.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo  = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('TimetableSubstitutionsService', () => {
  let service: TimetableSubstitutionsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableSubstitutionsService,
        { provide: getRepositoryToken(TimetableSubstitutionEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(TimetableSubstitutionsService);
    repo    = module.get(getRepositoryToken(TimetableSubstitutionEntity));
  });

  describe('create', () => {
    const dto = {
      date: '2025-09-15',
      slot_id: 'slot-1',
      absent_staff_id: 'staff-1',
    };

    it('creates a substitution and returns DTO', async () => {
      const entity = {
        ...dto,
        id: 'sub-1',
        school_id: 'school-1',
        substitute_staff_id: null,
        reason: null,
        note: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto, mockUser);
      expect(result.date).toBe('2025-09-15');
      expect(result.absent_staff_id).toBe('staff-1');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });
});
