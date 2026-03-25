import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClassSectionsService } from '../service';
import { ClassSectionEntity } from '../../../entities/class-section.entity';
import { ClassEntity } from '../../../entities/class.entity';
import { SectionEntity } from '../../../entities/section.entity';
import { AcademicYearEntity } from '../../../entities/academic-year.entity';
import { ClassSectionSubjectEntity } from '../../../entities/class-section-subject.entity';
import { ClassTeacherAssignmentEntity } from '../../../entities/class-teacher-assignment.entity';
import { TeacherSubjectAssignmentEntity } from '../../../entities/teacher-subject-assignment.entity';
import { SubjectEntity } from '../../../entities/subject.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
});
const mockAudit = () => ({ log: jest.fn() });
const mockUser: AuthUser = {
  id: 'u1',
  email: 'a@b.com',
  first_name: 'A',
  last_name: 'B',
  role: 'admin',
  school_id: 's1',
  membership_id: 'm1',
};

const makeClass = () => ({ id: 'c1', school_id: 's1', name: 'Class 6', order_index: 1 });
const makeSection = () => ({ id: 'sec1', school_id: 's1', name: 'A' });
const makeYear = () => ({ id: 'y1', school_id: 's1', name: '2024-25', is_current: true });

describe('ClassSectionsService', () => {
  let service: ClassSectionsService;
  let cSectionRepo: ReturnType<typeof mockRepo>;
  let classRepo: ReturnType<typeof mockRepo>;
  let sectionRepo: ReturnType<typeof mockRepo>;
  let yearRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSectionsService,
        { provide: getRepositoryToken(ClassSectionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ClassEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SectionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(AcademicYearEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ClassSectionSubjectEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ClassTeacherAssignmentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(TeacherSubjectAssignmentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SubjectEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();

    service = module.get<ClassSectionsService>(ClassSectionsService);
    cSectionRepo = module.get(getRepositoryToken(ClassSectionEntity));
    classRepo = module.get(getRepositoryToken(ClassEntity));
    sectionRepo = module.get(getRepositoryToken(SectionEntity));
    yearRepo = module.get(getRepositoryToken(AcademicYearEntity));
  });

  it('should throw NotFoundException for missing class-section on findOne', async () => {
    cSectionRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 's1')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if class not found in school on create', async () => {
    classRepo.findOne.mockResolvedValue(null);
    sectionRepo.findOne.mockResolvedValue(makeSection());
    yearRepo.findOne.mockResolvedValue(makeYear());
    await expect(
      service.create({ class_id: 'c-wrong', section_id: 'sec1', academic_year_id: 'y1' }, mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if class-section combo already exists', async () => {
    classRepo.findOne.mockResolvedValue(makeClass());
    sectionRepo.findOne.mockResolvedValue(makeSection());
    yearRepo.findOne.mockResolvedValue(makeYear());
    cSectionRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ class_id: 'c1', section_id: 'sec1', academic_year_id: 'y1' }, mockUser),
    ).rejects.toThrow(ConflictException);
  });

  it('should create a class-section successfully when no duplicates', async () => {
    classRepo.findOne.mockResolvedValue(makeClass());
    sectionRepo.findOne.mockResolvedValue(makeSection());
    yearRepo.findOne.mockResolvedValue(makeYear());
    cSectionRepo.findOne.mockResolvedValue(null);
    const newCs = { id: 'new-cs', school_id: 's1', class_id: 'c1', section_id: 'sec1', academic_year_id: 'y1', capacity: null, room_no: null, status: 'active', created_at: new Date(), updated_at: new Date() };
    cSectionRepo.create.mockReturnValue(newCs);
    cSectionRepo.save.mockResolvedValue(newCs);
    const result = await service.create({ class_id: 'c1', section_id: 'sec1', academic_year_id: 'y1' }, mockUser);
    expect(result.id).toBe('new-cs');
    expect(result.school_id).toBe('s1');
  });
});
