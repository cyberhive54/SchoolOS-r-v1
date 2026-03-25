import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from '../../entities/department.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateDepartmentDto, UpdateDepartmentDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly repo: Repository<DepartmentEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDepartmentDto, user: AuthUser): Promise<DepartmentEntity> {
    const existing = await this.repo.findOne({
      where: { school_id: user.school_id, name: dto.name, is_active: true },
    });
    if (existing) {
      throw new ConflictException({ error: { code: 'CONFLICT', message: `Department '${dto.name}' already exists.` } });
    }
    const dept = this.repo.create({
      school_id: user.school_id,
      name: dto.name,
      description: dto.description ?? null,
      head_staff_id: dto.head_staff_id ?? null,
      is_active: true,
    });
    const saved = await this.repo.save(dept);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'department', resource_id: saved.id, actor_id: user.id, new_value: { name: saved.name } });
    return saved;
  }

  async findAll(schoolId: string): Promise<DepartmentEntity[]> {
    return this.repo.find({ where: { school_id: schoolId }, order: { name: 'ASC' } });
  }

  async update(id: string, dto: UpdateDepartmentDto, user: AuthUser): Promise<DepartmentEntity> {
    const dept = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!dept) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Department not found.' } });
    if (dto.name && dto.name !== dept.name) {
      const dup = await this.repo.findOne({ where: { school_id: user.school_id, name: dto.name, is_active: true } });
      if (dup && dup.id !== id) throw new ConflictException({ error: { code: 'CONFLICT', message: `Department '${dto.name}' already exists.` } });
    }
    Object.assign(dept, dto as object);
    const saved = await this.repo.save(dept);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'department', resource_id: id, actor_id: user.id, new_value: dto as Record<string, unknown> });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const dept = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!dept) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Department not found.' } });
    dept.is_active = false;
    await this.repo.save(dept);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'department', resource_id: id, actor_id: user.id });
  }
}
