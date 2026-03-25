import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveTypeEntity } from '../../entities/leave-type.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveTypeEntity)
    private readonly repo: Repository<LeaveTypeEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateLeaveTypeDto, user: AuthUser): Promise<LeaveTypeEntity> {
    const existing = await this.repo.findOne({ where: { school_id: user.school_id, code: dto.code.toUpperCase(), is_active: true } });
    if (existing) throw new ConflictException({ error: { code: 'CONFLICT', message: `Leave type code '${dto.code}' already exists.` } });

    const lt = this.repo.create({
      school_id: user.school_id,
      name: dto.name,
      code: dto.code.toUpperCase(),
      max_days_per_year: dto.max_days_per_year,
      is_paid: dto.is_paid ?? true,
      carry_forward: dto.carry_forward ?? false,
      applicable_to: (dto.applicable_to ?? 'all') as LeaveTypeEntity['applicable_to'],
      is_active: true,
    });
    const saved = await this.repo.save(lt);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'leave_type', resource_id: saved.id, actor_id: user.id, new_value: { code: saved.code } });
    return saved;
  }

  async findAll(schoolId: string): Promise<LeaveTypeEntity[]> {
    return this.repo.find({ where: { school_id: schoolId }, order: { name: 'ASC' } });
  }

  async update(id: string, dto: UpdateLeaveTypeDto, user: AuthUser): Promise<LeaveTypeEntity> {
    const lt = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!lt) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Leave type not found.' } });
    Object.assign(lt, dto as object);
    const saved = await this.repo.save(lt);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'leave_type', resource_id: id, actor_id: user.id, new_value: dto as Record<string, unknown> });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const lt = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!lt) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Leave type not found.' } });
    lt.is_active = false;
    await this.repo.save(lt);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'leave_type', resource_id: id, actor_id: user.id });
  }
}
