import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StaffDocumentsService } from '../service';
import { StaffDocumentEntity, StaffDocumentType } from '../../../entities/staff-document.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo  = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockUser  = { id: 'user-1', school_id: 'school-1' } as any;

describe('StaffDocumentsService', () => {
  let service: StaffDocumentsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffDocumentsService,
        { provide: getRepositoryToken(StaffDocumentEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(StaffDocumentsService);
    repo    = module.get(getRepositoryToken(StaffDocumentEntity));
  });

  describe('create', () => {
    it('creates a staff document and returns DTO', async () => {
      const dto = {
        document_type: StaffDocumentType.APPOINTMENT_LETTER,
        title: 'Appointment Letter',
        file_url: 'https://storage.schoolos.com/test.pdf',
        file_name: 'test.pdf',
      };
      const entity = {
        ...dto,
        id: 'doc-1',
        school_id: 'school-1',
        staff_id: 'staff-1',
        file_size_kb: null,
        mime_type: null,
        uploaded_by: 'user-1',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create('staff-1', dto, mockUser);
      expect(result.title).toBe('Appointment Letter');
      expect(result.document_type).toBe(StaffDocumentType.APPOINTMENT_LETTER);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if document not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'staff-1', 'school-1')).rejects.toThrow(NotFoundException);
    });
  });
});
