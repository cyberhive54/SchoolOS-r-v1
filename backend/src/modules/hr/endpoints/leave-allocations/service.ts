import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveAllocationEntity } from '../../entities/leave-allocation.entity';
import { LeaveTypeEntity } from '../../entities/leave-type.entity';
import { StaffEntity } from '../../entities/staff.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { BulkAllocateDto, UpdateAllocationDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class LeaveAllocationsService {
  constructor(
    @InjectRepository(LeaveAllocationEntity)
    private readonly allocRepo: Repository<LeaveAllocationEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly ltRepo: Repository<LeaveTypeEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    private readonly auditService: AuditService,
  ) {}

  async bulkAllocate(dto: BulkAllocateDto, user: AuthUser): Promise<{ allocated: number; skipped: number }> {
    const [leaveTypes, activeStaff] = await Promise.all([
      this.ltRepo.find({ where: { school_id: user.school_id, is_active: true } }),
      this.staffRepo.find({ where: { school_id: user.school_id, status: 'active' } }),
    ]);

    let allocated = 0;
    let skipped = 0;

    for (const staff of activeStaff) {
      for (const lt of leaveTypes) {
        const existing = await this.allocRepo.findOne({
          where: { staff_id: staff.id, leave_type_id: lt.id, academic_year_id: dto.academic_year_id },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await this.allocRepo.save(this.allocRepo.create({
          school_id: user.school_id,
          staff_id: staff.id,
          leave_type_id: lt.id,
          academic_year_id: dto.academic_year_id,
          allocated_days: lt.max_days_per_year,
          used_days: 0,
        }));
        allocated++;
      }
    }

    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'leave_allocation_bulk', resource_id: dto.academic_year_id, actor_id: user.id, new_value: { allocated, skipped } });
    return { allocated, skipped };
  }

  async findByStaff(staffId: string, schoolId: string, academicYearId?: string): Promise<(LeaveAllocationEntity & { remaining_days: number })[]> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId, school_id: schoolId } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });

    const qb = this.allocRepo.createQueryBuilder('a')
      .where('a.school_id = :schoolId', { schoolId })
      .andWhere('a.staff_id = :staffId', { staffId });
    if (academicYearId) qb.andWhere('a.academic_year_id = :yr', { yr: academicYearId });

    const allocs = await qb.getMany();
    return allocs.map(a => ({ ...a, remaining_days: Math.max(0, a.allocated_days - a.used_days) }));
  }

  async update(id: string, dto: UpdateAllocationDto, user: AuthUser): Promise<LeaveAllocationEntity> {
    const alloc = await this.allocRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!alloc) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Leave allocation not found.' } });
    alloc.allocated_days = dto.allocated_days;
    const saved = await this.allocRepo.save(alloc);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'leave_allocation', resource_id: id, actor_id: user.id, new_value: dto as unknown as Record<string, unknown> });
    return saved;
  }
}
