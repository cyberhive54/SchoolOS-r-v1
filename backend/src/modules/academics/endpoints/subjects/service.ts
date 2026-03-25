import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { SubjectEntity } from '../../entities/subject.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateSubjectDto, UpdateSubjectDto } from './dto/request.dto';
import type { SubjectDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSubjectDto, user: AuthUser): Promise<SubjectDto> {
    const existing = await this.subjectRepo.findOne({
      where: { school_id: user.school_id, code: dto.code.toUpperCase(), deleted_at: IsNull() },
    });
    if (existing) {
      throw new ConflictException({ error: { code: 'CONFLICT', message: `Subject with code '${dto.code}' already exists.` } });
    }
    const subject = this.subjectRepo.create({
      school_id: user.school_id,
      name: dto.name,
      code: dto.code.toUpperCase(),
      type: dto.type ?? 'core',
    });
    const saved = await this.subjectRepo.save(subject);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'subject', resource_id: saved.id, actor_id: user.id, new_value: { name: saved.name, code: saved.code } });
    return this.toDto(saved);
  }

  async findAll(schoolId: string, q?: string): Promise<SubjectDto[]> {
    const where = q
      ? [
          { school_id: schoolId, name: ILike(`%${q}%`), deleted_at: IsNull() },
          { school_id: schoolId, code: ILike(`%${q}%`), deleted_at: IsNull() },
        ]
      : { school_id: schoolId, deleted_at: IsNull() };
    const subjects = await this.subjectRepo.find({ where, order: { name: 'ASC' } });
    return subjects.map((s) => this.toDto(s));
  }

  async findOne(id: string, schoolId: string): Promise<SubjectDto> {
    const subject = await this.subjectRepo.findOne({ where: { id, school_id: schoolId, deleted_at: IsNull() } });
    if (!subject) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not found.' } });
    return this.toDto(subject);
  }

  async update(id: string, dto: UpdateSubjectDto, user: AuthUser): Promise<SubjectDto> {
    const subject = await this.subjectRepo.findOne({ where: { id, school_id: user.school_id, deleted_at: IsNull() } });
    if (!subject) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not found.' } });
    if (dto.code && dto.code.toUpperCase() !== subject.code) {
      const conflict = await this.subjectRepo.findOne({ where: { school_id: user.school_id, code: dto.code.toUpperCase(), deleted_at: IsNull() } });
      if (conflict) throw new ConflictException({ error: { code: 'CONFLICT', message: `Subject with code '${dto.code}' already exists.` } });
    }
    if (dto.name !== undefined) subject.name = dto.name;
    if (dto.code !== undefined) subject.code = dto.code.toUpperCase();
    if (dto.type !== undefined) subject.type = dto.type;
    const saved = await this.subjectRepo.save(subject);
    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const subject = await this.subjectRepo.findOne({ where: { id, school_id: user.school_id, deleted_at: IsNull() } });
    if (!subject) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not found.' } });
    await this.subjectRepo.softDelete(id);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'subject', resource_id: id, actor_id: user.id });
  }

  private toDto(s: SubjectEntity): SubjectDto {
    return { id: s.id, school_id: s.school_id, name: s.name, code: s.code, type: s.type, created_at: s.created_at.toISOString(), updated_at: s.updated_at.toISOString() };
  }
}
