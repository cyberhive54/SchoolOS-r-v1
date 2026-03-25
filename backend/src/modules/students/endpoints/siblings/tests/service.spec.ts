import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SiblingsService } from '../service';
import { StudentSiblingEntity } from '../../../entities/student-sibling.entity';
import { StudentEntity } from '../../../entities/student.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo  = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('SiblingsService', () => {
  let service: SiblingsService;
  let sibRepo: ReturnType<typeof mockRepo>;
  let studentRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiblingsService,
        { provide: getRepositoryToken(StudentSiblingEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentEntity),        useFactory: mockRepo },
        { provide: AuditService,                            useFactory: mockAudit },
      ],
    }).compile();
    service     = module.get(SiblingsService);
    sibRepo     = module.get(getRepositoryToken(StudentSiblingEntity));
    studentRepo = module.get(getRepositoryToken(StudentEntity));
  });

  describe('link', () => {
    it('throws BadRequestException if student links to themselves', async () => {
      await expect(service.link('s-1', { sibling_id: 's-1' }, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if sibling student not found', async () => {
      studentRepo.findOne
        .mockResolvedValueOnce({ id: 's-1', first_name: 'A', last_name: 'B', admission_no: '001' })
        .mockResolvedValueOnce(null);
      await expect(service.link('s-1', { sibling_id: 's-2' }, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('creates bi-directional sibling link', async () => {
      const studentA = { id: 's-1', first_name: 'Rahul',  last_name: 'Kumar', admission_no: '001' };
      const studentB = { id: 's-2', first_name: 'Priya',  last_name: 'Kumar', admission_no: '002' };
      studentRepo.findOne
        .mockResolvedValueOnce(studentA)
        .mockResolvedValueOnce(studentB);
      sibRepo.findOne.mockResolvedValue(null);
      const savedRow = { id: 'link-1', school_id: 'school-1', student_id: 's-1', sibling_id: 's-2', created_at: new Date() };
      sibRepo.create.mockReturnValue(savedRow);
      sibRepo.save.mockResolvedValue([savedRow, {}]);

      const result = await service.link('s-1', { sibling_id: 's-2' }, mockUser);
      expect(result.sibling_id).toBe('s-2');
      expect(result.first_name).toBe('Priya');
    });
  });
});
