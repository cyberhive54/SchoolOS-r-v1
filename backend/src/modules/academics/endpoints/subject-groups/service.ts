import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SubjectGroupEntity } from '../../entities/subject-group.entity';
import { SubjectGroupItemEntity } from '../../entities/subject-group-item.entity';
import { SubjectEntity } from '../../entities/subject.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateSubjectGroupDto, UpdateSubjectGroupDto } from './dto/request.dto';
import type { SubjectGroupDto } from './dto/response.dto';
import type { SubjectDto } from '../subjects/dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class SubjectGroupsService {
  constructor(
    @InjectRepository(SubjectGroupEntity)
    private readonly groupRepo: Repository<SubjectGroupEntity>,
    @InjectRepository(SubjectGroupItemEntity)
    private readonly itemRepo: Repository<SubjectGroupItemEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSubjectGroupDto, user: AuthUser): Promise<SubjectGroupDto> {
    const existing = await this.groupRepo.findOne({ where: { school_id: user.school_id, name: dto.name } });
    if (existing) throw new ConflictException({ error: { code: 'CONFLICT', message: `Subject group '${dto.name}' already exists.` } });
    const group = this.groupRepo.create({ school_id: user.school_id, name: dto.name, description: dto.description ?? null });
    const saved = await this.groupRepo.save(group);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'subject_group', resource_id: saved.id, actor_id: user.id });
    return this.toDto(saved, []);
  }

  async findAll(schoolId: string): Promise<SubjectGroupDto[]> {
    const groups = await this.groupRepo.find({ where: { school_id: schoolId }, order: { name: 'ASC' } });
    return Promise.all(groups.map(async (g) => {
      const items = await this.itemRepo.find({ where: { subject_group_id: g.id, school_id: schoolId } });
      const subjects = await Promise.all(items.map(async (i) => {
        const s = await this.subjectRepo.findOne({ where: { id: i.subject_id, deleted_at: IsNull() } });
        if (!s) return null;
        const mapped: SubjectDto = { id: s.id, school_id: s.school_id, name: s.name, code: s.code, type: s.type, created_at: s.created_at.toISOString(), updated_at: s.updated_at.toISOString() };
        return mapped;
      }));
      const validSubjects = subjects.filter((s): s is SubjectDto => s !== null);
      return this.toDto(g, validSubjects);
    }));
  }

  async update(id: string, dto: UpdateSubjectGroupDto, user: AuthUser): Promise<SubjectGroupDto> {
    const group = await this.groupRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!group) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject group not found.' } });
    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description ?? null;
    const saved = await this.groupRepo.save(group);
    return this.toDto(saved, []);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!group) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject group not found.' } });
    await this.itemRepo.delete({ subject_group_id: id });
    await this.groupRepo.remove(group);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'subject_group', resource_id: id, actor_id: user.id });
  }

  async addSubject(id: string, subjectId: string, user: AuthUser): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!group) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject group not found.' } });
    const subject = await this.subjectRepo.findOne({ where: { id: subjectId, school_id: user.school_id, deleted_at: IsNull() } });
    if (!subject) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not found.' } });
    const existing = await this.itemRepo.findOne({ where: { subject_group_id: id, subject_id: subjectId } });
    if (existing) throw new ConflictException({ error: { code: 'CONFLICT', message: 'Subject already in this group.' } });
    const item = this.itemRepo.create({ school_id: user.school_id, subject_group_id: id, subject_id: subjectId });
    await this.itemRepo.save(item);
  }

  async removeSubject(id: string, subjectId: string, user: AuthUser): Promise<void> {
    const item = await this.itemRepo.findOne({ where: { subject_group_id: id, subject_id: subjectId, school_id: user.school_id } });
    if (!item) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not in this group.' } });
    await this.itemRepo.remove(item);
  }

  private toDto(g: SubjectGroupEntity, subjects: SubjectDto[]): SubjectGroupDto {
    return {
      id: g.id,
      school_id: g.school_id,
      name: g.name,
      description: g.description,
      subjects,
      created_at: g.created_at.toISOString(),
      updated_at: g.updated_at.toISOString(),
    };
  }
}
