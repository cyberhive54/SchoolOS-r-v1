import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { PromotionsService, PROMOTION_QUEUE } from '../service';
import { ClassSectionEntity } from '../../../entities/class-section.entity';
import { AcademicYearEntity } from '../../../entities/academic-year.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({ findOne: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockQueue = () => ({ add: jest.fn(), getJob: jest.fn() });

const mockUser: AuthUser = {
  id: 'u1',
  email: 'a@b.com',
  first_name: 'A',
  last_name: 'B',
  role: 'admin',
  school_id: 's1',
  membership_id: 'm1',
};

const makeYear = (id: string, name: string) => ({
  id,
  school_id: 's1',
  name,
  start_date: '2024-04-01',
  end_date: '2025-03-31',
  is_current: false,
  created_at: new Date(),
  updated_at: new Date(),
});

const makeCs = (id: string) => ({
  id,
  school_id: 's1',
  class_id: 'c1',
  section_id: 'sec1',
  academic_year_id: 'y1',
  capacity: null,
  room_no: null,
  created_at: new Date(),
  updated_at: new Date(),
});

describe('PromotionsService', () => {
  let service: PromotionsService;
  let yearRepo: ReturnType<typeof mockRepo>;
  let csRepo: ReturnType<typeof mockRepo>;
  let queue: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(ClassSectionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(AcademicYearEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
        { provide: getQueueToken(PROMOTION_QUEUE), useFactory: mockQueue },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    yearRepo = module.get(getRepositoryToken(AcademicYearEntity));
    csRepo = module.get(getRepositoryToken(ClassSectionEntity));
    queue = module.get(getQueueToken(PROMOTION_QUEUE));
  });

  const validDto = {
    from_academic_year_id: 'y1',
    to_academic_year_id: 'y2',
    promotions: [
      {
        student_id: 'stu-1',
        from_class_section_id: 'cs1',
        to_class_section_id: 'cs2',
        status: 'promoted' as const,
      },
    ],
  };

  it('should throw NotFoundException if source year not found', async () => {
    yearRepo.findOne.mockResolvedValue(null);
    csRepo.findOne.mockResolvedValue(null);
    await expect(
      service.bulkPromote(validDto, mockUser, 'idem-key-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if target year not found', async () => {
    yearRepo.findOne
      .mockResolvedValueOnce(makeYear('y1', '2024-25'))
      .mockResolvedValueOnce(null);
    csRepo.findOne.mockResolvedValue(makeCs('cs1'));
    await expect(
      service.bulkPromote(validDto, mockUser, 'idem-key-2'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException on duplicate idempotency key', async () => {
    yearRepo.findOne.mockResolvedValue(makeYear('y1', '2024-25'));
    csRepo.findOne.mockResolvedValue(makeCs('cs1'));
    queue.getJob.mockResolvedValue({ id: 'existing-job-id' });
    await expect(
      service.bulkPromote(validDto, mockUser, 'duplicate-key'),
    ).rejects.toThrow(ConflictException);
  });

  it('should queue a job and return 202 response shape', async () => {
    yearRepo.findOne.mockResolvedValue(makeYear('y1', '2024-25'));
    csRepo.findOne.mockResolvedValue(makeCs('cs1'));
    queue.getJob.mockResolvedValue(null);
    queue.add.mockResolvedValue({ id: 'job-123' });

    const result = await service.bulkPromote(validDto, mockUser, 'idem-key-3');

    expect(result.job_id).toBe('job-123');
    expect(result.status).toBe('queued');
    expect(result.total).toBe(1);
    expect(queue.add).toHaveBeenCalledWith(
      'bulk-promote',
      expect.objectContaining({ school_id: 's1', actor_id: 'u1' }),
      { jobId: 'idem-key-3' },
    );
  });
});
