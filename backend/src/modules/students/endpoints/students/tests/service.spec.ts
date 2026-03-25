import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudentsService } from '../service';
import { StudentEntity } from '../../../entities/student.entity';
import { StudentEnrollmentEntity } from '../../../entities/student-enrollment.entity';
import { StudentGuardianEntity } from '../../../entities/student-guardian.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});
const mockAudit = () => ({ log: jest.fn() });
const mockEvents = () => ({ emit: jest.fn() });

describe('StudentsService', () => {
  let service: StudentsService;
  let studentRepo: ReturnType<typeof mockRepo>;
  let enrollmentRepo: ReturnType<typeof mockRepo>;

  const user = { id: 'u1', school_id: 'school1', role: 'admin', email: 'a@b.com' } as never;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: getRepositoryToken(StudentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentEnrollmentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
        { provide: EventEmitter2, useFactory: mockEvents },
      ],
    }).compile();
    service = module.get(StudentsService);
    studentRepo = module.get(getRepositoryToken(StudentEntity));
    enrollmentRepo = module.get(getRepositoryToken(StudentEnrollmentEntity));
  });

  describe('create', () => {
    it('creates a student successfully', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      studentRepo.create.mockReturnValue({ id: 's1', admission_no: '2025001', first_name: 'Arjun', last_name: 'Sharma' });
      studentRepo.save.mockResolvedValue({ id: 's1', admission_no: '2025001', first_name: 'Arjun', last_name: 'Sharma' });
      enrollmentRepo.create.mockReturnValue({});
      enrollmentRepo.save.mockResolvedValue({});

      const result = await service.create(
        { admission_no: '2025001', first_name: 'Arjun', last_name: 'Sharma', date_of_birth: '2015-01-01', gender: 'male' },
        user,
      );
      expect(result.id).toBe('s1');
    });

    it('throws ConflictException when admission_no already exists', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ admission_no: '2025001', first_name: 'Arjun', last_name: 'Sharma', date_of_birth: '2015-01-01', gender: 'male' }, user),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('returns student with guardian count', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 's1', school_id: 'school1' });
      const guardianRepo = service['guardianLinkRepo'];
      (guardianRepo.count as jest.Mock).mockResolvedValue(2);
      const result = await service.findOne('s1', 'school1');
      expect(result.id).toBe('s1');
      expect(result.guardian_count).toBe(2);
    });

    it('throws NotFoundException when student not found', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing', 'school1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes student', async () => {
      const student = { id: 's1', status: 'active', deleted_at: null };
      studentRepo.findOne.mockResolvedValue(student);
      studentRepo.save.mockResolvedValue({ ...student, status: 'inactive', deleted_at: new Date() });
      await service.remove('s1', user);
      expect(studentRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when student not found', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('missing', user)).rejects.toThrow(NotFoundException);
    });
  });
});
