import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudentDocumentsService } from '../service';
import { StudentDocumentEntity, StudentDocumentType } from '../../../entities/student-document.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo  = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('StudentDocumentsService', () => {
  let service: StudentDocumentsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDocumentsService,
        { provide: getRepositoryToken(StudentDocumentEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(StudentDocumentsService);
    repo    = module.get(getRepositoryToken(StudentDocumentEntity));
  });

  describe('create', () => {
    it('creates a document record and returns DTO', async () => {
      const dto = {
        document_type: StudentDocumentType.BIRTH_CERTIFICATE,
        title: 'Birth Certificate',
        file_url: 'https://storage.schoolos.com/test.pdf',
        file_name: 'test.pdf',
      };
      const entity = {
        ...dto,
        id: 'doc-1',
        school_id: 'school-1',
        student_id: 'student-1',
        file_size_kb: null,
        mime_type: null,
        uploaded_by: 'user-1',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create('student-1', dto, mockUser);
      expect(result.title).toBe('Birth Certificate');
      expect(result.document_type).toBe(StudentDocumentType.BIRTH_CERTIFICATE);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if document not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'student-1', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });
});
