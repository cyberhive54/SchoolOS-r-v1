import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffAttendanceEntity } from '../../entities/staff-attendance.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import { PLATFORM } from '@schoolos/config';
import type { BulkMarkAttendanceDto, ListAttendanceQueryDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

export interface AttendanceSummaryItem {
  staff_id: string;
  present: number;
  absent: number;
  half_day: number;
  on_leave: number;
  holiday: number;
  total: number;
}

export interface PaginatedAttendance {
  items: StaffAttendanceEntity[];
  total: number;
  page: number;
  per_page: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(StaffAttendanceEntity)
    private readonly repo: Repository<StaffAttendanceEntity>,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async bulkMark(dto: BulkMarkAttendanceDto, user: AuthUser): Promise<{ marked: number }> {
    let marked = 0;
    for (const rec of dto.records) {
      const existing = await this.repo.findOne({
        where: { school_id: user.school_id, staff_id: rec.staff_id, date: dto.date },
      });
      if (existing) {
        existing.status = rec.status as StaffAttendanceEntity['status'];
        existing.note = rec.note ?? null;
        existing.leave_request_id = rec.leave_request_id ?? null;
        existing.marked_by = user.id;
        await this.repo.save(existing);
      } else {
        await this.repo.save(this.repo.create({
          school_id: user.school_id,
          staff_id: rec.staff_id,
          date: dto.date,
          status: rec.status as StaffAttendanceEntity['status'],
          note: rec.note ?? null,
          leave_request_id: rec.leave_request_id ?? null,
          marked_by: user.id,
        }));
      }
      marked++;
    }

    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'staff_attendance', resource_id: dto.date, actor_id: user.id, new_value: { date: dto.date, count: marked } });
    this.eventEmitter.emit('staff_attendance.marked', { date: dto.date, school_id: user.school_id, count: marked });
    return { marked };
  }

  async findAll(schoolId: string, query: ListAttendanceQueryDto): Promise<PaginatedAttendance> {
    const page = Math.max(1, Number(query.page) || 1);
    const per_page = Math.min(PLATFORM.MAX_PAGE_SIZE, Math.max(1, Number(query.per_page) || PLATFORM.DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * per_page;

    const qb = this.repo.createQueryBuilder('a')
      .where('a.school_id = :schoolId', { schoolId })
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.staff_id', 'ASC')
      .skip(skip)
      .take(per_page);

    if (query.filter?.date) qb.andWhere('a.date = :date', { date: query.filter.date });
    if (query.filter?.date_gte) qb.andWhere('a.date >= :gte', { gte: query.filter.date_gte });
    if (query.filter?.date_lte) qb.andWhere('a.date <= :lte', { lte: query.filter.date_lte });
    if (query.filter?.staff_id) qb.andWhere('a.staff_id = :sid', { sid: query.filter.staff_id });
    if (query.filter?.status) qb.andWhere('a.status = :status', { status: query.filter.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, per_page };
  }

  async getSummary(
    schoolId: string,
    dateFrom?: string,
    dateTo?: string,
    staffId?: string,
  ): Promise<AttendanceSummaryItem[]> {
    const qb = this.repo.createQueryBuilder('a')
      .select('a.staff_id', 'staff_id')
      .addSelect(`SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int`, 'present')
      .addSelect(`SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int`, 'absent')
      .addSelect(`SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END)::int`, 'half_day')
      .addSelect(`SUM(CASE WHEN a.status = 'on_leave' THEN 1 ELSE 0 END)::int`, 'on_leave')
      .addSelect(`SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END)::int`, 'holiday')
      .addSelect('COUNT(*)::int', 'total')
      .where('a.school_id = :schoolId', { schoolId })
      .groupBy('a.staff_id');

    if (dateFrom) qb.andWhere('a.date >= :df', { df: dateFrom });
    if (dateTo) qb.andWhere('a.date <= :dt', { dt: dateTo });
    if (staffId) qb.andWhere('a.staff_id = :sid', { sid: staffId });

    return qb.getRawMany() as Promise<AttendanceSummaryItem[]>;
  }
}
