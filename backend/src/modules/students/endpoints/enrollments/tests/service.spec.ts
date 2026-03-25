import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentsService } from '../service';
import { StudentEnrollmentEntity } from '../../../entities/student-enrollment.entity';
import { StudentEntity } from '../../../entities/student.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});
const mockEvents = () => ({ emit: jest.fn() });

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let studentRepo: ReturnType<typeof mockRepo>;
  let enrollmentRepo: ReturnType<typeof mockRepo>;

  const user = { id: 'u1', school_id: 'school1', role: 'admin', email: 'a@b.com' } as never;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: getRepositoryToken(StudentEnrollmentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentEntity), useFactory: mockRepo },
        { provide: EventEmitter2, useFactory: mockEvents },
      ],
    }).compile();
    service = module.get(EnrollmentsService);
    studentRepo = module.get(getRepositoryToken(StudentEntity));
    enrollmentRepo = module.get(getRepositoryToken(StudentEnrollmentEntity));
  });

  it('throws NotFoundException when student not found', async () => {
    studentRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create('missing', { class_section_id: 'cs1', academic_year_id: 'ay1' }, user),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when active enrollment already exists', async () => {
    studentRepo.findOne.mockResolvedValue({ id: 's1' });
    enrollmentRepo.findOne.mockResolvedValue({ id: 'e1', status: 'active' });
    await expect(
      service.create('s1', { class_section_id: 'cs1', academic_year_id: 'ay1' }, user),
    ).rejects.toThrow(ConflictException);
  });

  it('creates enrollment successfully', async () => {
    studentRepo.findOne.mockResolvedValue({ id: 's1' });
    enrollmentRepo.findOne.mockResolvedValue(null);
    enrollmentRepo.create.mockReturnValue({ id: 'e1' });
    enrollmentRepo.save.mockResolvedValue({ id: 'e1', status: 'active' });
    const result = await service.create('s1', { class_section_id: 'cs1', academic_year_id: 'ay1' }, user);
    expect(result.id).toBe('e1');
  });
});
