import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeaveRequestEntity } from '../../entities/leave-request.entity';
import { LeaveAllocationEntity } from '../../entities/leave-allocation.entity';
import { StaffEntity } from '../../entities/staff.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import { PLATFORM } from '@schoolos/config';
import type { CreateLeaveRequestDto, ReviewLeaveRequestDto, ListLeaveRequestsQueryDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export interface PaginatedLeaveRequests {
  items: LeaveRequestEntity[];
  total: number;
  page: number;
  per_page: number;
}

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequestEntity)
    private readonly reqRepo: Repository<LeaveRequestEntity>,
    @InjectRepository(LeaveAllocationEntity)
    private readonly allocRepo: Repository<LeaveAllocationEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getStaffForUser(user: AuthUser, staffIdOverride?: string): Promise<StaffEntity> {
    if (staffIdOverride) {
      const s = await this.staffRepo.findOne({ where: { id: staffIdOverride, school_id: user.school_id } });
      if (!s) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });
      return s;
    }
    const s = await this.staffRepo.findOne({ where: { user_id: user.id, school_id: user.school_id } });
    if (!s) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'No staff record linked to your account.' } });
    return s;
  }

  async create(dto: CreateLeaveRequestDto, user: AuthUser): Promise<LeaveRequestEntity> {
    const staff = await this.getStaffForUser(user, dto.staff_id);
    const totalDays = daysBetween(dto.start_date, dto.end_date);

    if (new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new BadRequestException({ error: { code: 'INVALID_DATES', message: 'End date must be on or after start date.' } });
    }

    const req = this.reqRepo.create({
      school_id: user.school_id,
      staff_id: staff.id,
      leave_type_id: dto.leave_type_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      total_days: totalDays,
      reason: dto.reason,
      status: 'pending',
    });
    const saved = await this.reqRepo.save(req);
    await this.auditService.log({ school_id: user.school_id, action: 'CREATE', resource_type: 'leave_request', resource_id: saved.id, actor_id: user.id });
    this.eventEmitter.emit('leave_request.submitted', { leave_request_id: saved.id, school_id: user.school_id });
    return saved;
  }

  async findAll(schoolId: string, query: ListLeaveRequestsQueryDto): Promise<PaginatedLeaveRequests> {
    const page = Math.max(1, Number(query.page) || 1);
    const per_page = Math.min(PLATFORM.MAX_PAGE_SIZE, Math.max(1, Number(query.per_page) || PLATFORM.DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * per_page;

    const qb = this.reqRepo.createQueryBuilder('lr')
      .where('lr.school_id = :schoolId', { schoolId })
      .orderBy('lr.created_at', 'DESC')
      .skip(skip)
      .take(per_page);

    if (query.filter?.staff_id) qb.andWhere('lr.staff_id = :sid', { sid: query.filter.staff_id });
    if (query.filter?.status) qb.andWhere('lr.status = :status', { status: query.filter.status });
    if (query.filter?.leave_type_id) qb.andWhere('lr.leave_type_id = :lt', { lt: query.filter.leave_type_id });
    if (query.filter?.date_from) qb.andWhere('lr.start_date >= :df', { df: query.filter.date_from });
    if (query.filter?.date_to) qb.andWhere('lr.end_date <= :dt', { dt: query.filter.date_to });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, per_page };
  }

  async findOne(id: string, schoolId: string): Promise<LeaveRequestEntity> {
    const req = await this.reqRepo.findOne({ where: { id, school_id: schoolId } });
    if (!req) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Leave request not found.' } });
    return req;
  }

  async approve(id: string, dto: ReviewLeaveRequestDto, user: AuthUser): Promise<LeaveRequestEntity> {
    const req = await this.findOne(id, user.school_id);
    if (req.status !== 'pending') {
      throw new BadRequestException({ error: { code: 'INVALID_STATUS', message: 'Only pending requests can be approved.' } });
    }

    req.status = 'approved';
    req.reviewed_by = user.id;
    req.reviewed_at = new Date();
    req.review_note = dto.note ?? null;
    const saved = await this.reqRepo.save(req);

    const alloc = await this.allocRepo.findOne({
      where: { staff_id: req.staff_id, leave_type_id: req.leave_type_id },
    });
    if (alloc) {
      alloc.used_days = alloc.used_days + req.total_days;
      await this.allocRepo.save(alloc);
    }

    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'leave_request', resource_id: id, actor_id: user.id, new_value: { status: 'approved' } });
    this.eventEmitter.emit('leave_request.approved', { leave_request_id: id, school_id: user.school_id });
    return saved;
  }

  async reject(id: string, dto: ReviewLeaveRequestDto, user: AuthUser): Promise<LeaveRequestEntity> {
    const req = await this.findOne(id, user.school_id);
    if (req.status !== 'pending') {
      throw new BadRequestException({ error: { code: 'INVALID_STATUS', message: 'Only pending requests can be rejected.' } });
    }

    req.status = 'rejected';
    req.reviewed_by = user.id;
    req.reviewed_at = new Date();
    req.review_note = dto.note ?? null;
    const saved = await this.reqRepo.save(req);

    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'leave_request', resource_id: id, actor_id: user.id, new_value: { status: 'rejected' } });
    this.eventEmitter.emit('leave_request.rejected', { leave_request_id: id, school_id: user.school_id });
    return saved;
  }

  async cancel(id: string, user: AuthUser): Promise<LeaveRequestEntity> {
    const req = await this.findOne(id, user.school_id);
    if (req.status === 'cancelled') {
      throw new BadRequestException({ error: { code: 'ALREADY_CANCELLED', message: 'Request is already cancelled.' } });
    }
    const wasApproved = req.status === 'approved';
    req.status = 'cancelled';
    const saved = await this.reqRepo.save(req);

    if (wasApproved) {
      const alloc = await this.allocRepo.findOne({
        where: { staff_id: req.staff_id, leave_type_id: req.leave_type_id },
      });
      if (alloc) {
        alloc.used_days = Math.max(0, alloc.used_days - req.total_days);
        await this.allocRepo.save(alloc);
      }
    }

    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'leave_request', resource_id: id, actor_id: user.id, new_value: { status: 'cancelled' } });
    return saved;
  }
}
