import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SectionEntity } from '../../entities/section.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateSectionDto, UpdateSectionDto } from './dto/request.dto';
import type { SectionDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(SectionEntity)
    private readonly sectionRepo: Repository<SectionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSectionDto, user: AuthUser): Promise<SectionDto> {
    const existing = await this.sectionRepo.findOne({
      where: { school_id: user.school_id, name: dto.name, deleted_at: IsNull() },
    });
    if (existing) {
      throw new ConflictException({ error: { code: 'CONFLICT', message: `Section '${dto.name}' already exists.` } });
    }
    const section = this.sectionRepo.create({ school_id: user.school_id, name: dto.name });
    const saved = await this.sectionRepo.save(section);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'section', resource_id: saved.id, actor_id: user.id, new_value: { name: saved.name } });
    return this.toDto(saved);
  }

  async findAll(schoolId: string): Promise<SectionDto[]> {
    const sections = await this.sectionRepo.find({
      where: { school_id: schoolId, deleted_at: IsNull() },
      order: { name: 'ASC' },
    });
    return sections.map((s) => this.toDto(s));
  }

  async update(id: string, dto: UpdateSectionDto, user: AuthUser): Promise<SectionDto> {
    const section = await this.sectionRepo.findOne({ where: { id, school_id: user.school_id, deleted_at: IsNull() } });
    if (!section) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Section not found.' } });
    if (dto.name && dto.name !== section.name) {
      const conflict = await this.sectionRepo.findOne({ where: { school_id: user.school_id, name: dto.name, deleted_at: IsNull() } });
      if (conflict) throw new ConflictException({ error: { code: 'CONFLICT', message: `Section '${dto.name}' already exists.` } });
    }
    if (dto.name !== undefined) section.name = dto.name;
    const saved = await this.sectionRepo.save(section);
    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const section = await this.sectionRepo.findOne({ where: { id, school_id: user.school_id, deleted_at: IsNull() } });
    if (!section) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Section not found.' } });
    await this.sectionRepo.softDelete(id);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'section', resource_id: id, actor_id: user.id });
  }

  private toDto(s: SectionEntity): SectionDto {
    return { id: s.id, school_id: s.school_id, name: s.name, created_at: s.created_at.toISOString(), updated_at: s.updated_at.toISOString() };
  }
}
