import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { DesignationEntity } from '../../entities/designation.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateDesignationDto, UpdateDesignationDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class DesignationsService {
  constructor(
    @InjectRepository(DesignationEntity)
    private readonly repo: Repository<DesignationEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDesignationDto, user: AuthUser): Promise<DesignationEntity> {
    const des = this.repo.create({
      school_id: user.school_id,
      name: dto.name,
      department_id: dto.department_id ?? null,
      level: dto.level ?? null,
      is_teaching_staff: dto.is_teaching_staff ?? false,
      is_active: true,
    });
    const saved = await this.repo.save(des);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'designation', resource_id: saved.id, actor_id: user.id, new_value: { name: saved.name } });
    return saved;
  }

  async findAll(schoolId: string, departmentId?: string): Promise<DesignationEntity[]> {
    const where: FindOptionsWhere<DesignationEntity> = { school_id: schoolId };
    if (departmentId) (where as Record<string, unknown>).department_id = departmentId;
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async update(id: string, dto: UpdateDesignationDto, user: AuthUser): Promise<DesignationEntity> {
    const des = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!des) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Designation not found.' } });
    Object.assign(des, dto as object);
    const saved = await this.repo.save(des);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'designation', resource_id: id, actor_id: user.id, new_value: dto as Record<string, unknown> });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const des = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!des) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Designation not found.' } });
    des.is_active = false;
    await this.repo.save(des);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'designation', resource_id: id, actor_id: user.id });
  }
}
