import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffDocumentEntity } from '../../entities/staff-document.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateStaffDocumentDto, UpdateStaffDocumentDto } from './dto/request.dto';
import type { StaffDocumentDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class StaffDocumentsService {
  constructor(
    @InjectRepository(StaffDocumentEntity)
    private readonly docRepo: Repository<StaffDocumentEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(staffId: string, dto: CreateStaffDocumentDto, user: AuthUser): Promise<StaffDocumentDto> {
    const doc = this.docRepo.create({
      school_id: user.school_id,
      staff_id: staffId,
      document_type: dto.document_type,
      title: dto.title,
      file_url: dto.file_url,
      file_name: dto.file_name,
      file_size_kb: dto.file_size_kb ?? null,
      mime_type: dto.mime_type ?? null,
      uploaded_by: user.id,
      notes: dto.notes ?? null,
    });
    const saved = await this.docRepo.save(doc);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'staff_document',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { staff_id: staffId, title: saved.title, document_type: saved.document_type },
    });

    return this.toDto(saved);
  }

  async findAll(staffId: string, schoolId: string): Promise<StaffDocumentDto[]> {
    const docs = await this.docRepo.find({
      where: { staff_id: staffId, school_id: schoolId },
      order: { created_at: 'DESC' },
    });
    return docs.map((d) => this.toDto(d));
  }

  async findOne(id: string, staffId: string, schoolId: string): Promise<StaffDocumentDto> {
    const doc = await this.docRepo.findOne({
      where: { id, staff_id: staffId, school_id: schoolId },
    });
    if (!doc) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
    }
    return this.toDto(doc);
  }

  async update(id: string, staffId: string, dto: UpdateStaffDocumentDto, user: AuthUser): Promise<StaffDocumentDto> {
    const doc = await this.docRepo.findOne({
      where: { id, staff_id: staffId, school_id: user.school_id },
    });
    if (!doc) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
    }

    if (dto.document_type !== undefined) doc.document_type = dto.document_type;
    if (dto.title         !== undefined) doc.title         = dto.title;
    if (dto.notes         !== undefined) doc.notes         = dto.notes ?? null;

    const saved = await this.docRepo.save(doc);
    return this.toDto(saved);
  }

  async remove(id: string, staffId: string, user: AuthUser): Promise<void> {
    const doc = await this.docRepo.findOne({
      where: { id, staff_id: staffId, school_id: user.school_id },
    });
    if (!doc) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
    }
    await this.docRepo.delete(id);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'staff_document',
      resource_id: id,
      actor_id: user.id,
      old_value: { staff_id: staffId, title: doc.title },
    });
  }

  private toDto(d: StaffDocumentEntity): StaffDocumentDto {
    return {
      id: d.id,
      school_id: d.school_id,
      staff_id: d.staff_id,
      document_type: d.document_type,
      title: d.title,
      file_url: d.file_url,
      file_name: d.file_name,
      file_size_kb: d.file_size_kb,
      mime_type: d.mime_type,
      uploaded_by: d.uploaded_by,
      notes: d.notes,
      created_at: d.created_at.toISOString(),
      updated_at: d.updated_at.toISOString(),
    };
  }
}
