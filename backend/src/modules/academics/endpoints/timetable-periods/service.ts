import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimetablePeriodEntity } from '../../entities/timetable-period.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateTimetablePeriodDto, UpdateTimetablePeriodDto } from './dto/request.dto';
import type { TimetablePeriodDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class TimetablePeriodsService {
  constructor(
    @InjectRepository(TimetablePeriodEntity)
    private readonly periodRepo: Repository<TimetablePeriodEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTimetablePeriodDto, user: AuthUser): Promise<TimetablePeriodDto> {
    const existing = await this.periodRepo.findOne({
      where: {
        school_id: user.school_id,
        academic_year_id: dto.academic_year_id,
        period_number: dto.period_number,
      },
    });
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: `Period number ${dto.period_number} already exists for this academic year.`,
        },
      });
    }

    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException({
        error: { code: 'INVALID_TIME_RANGE', message: 'start_time must be before end_time.' },
      });
    }

    const period = this.periodRepo.create({
      school_id: user.school_id,
      academic_year_id: dto.academic_year_id,
      name: dto.name,
      period_number: dto.period_number,
      start_time: dto.start_time,
      end_time: dto.end_time,
      is_break: dto.is_break ?? false,
      is_active: dto.is_active ?? true,
    });
    const saved = await this.periodRepo.save(period);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'timetable_period',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { name: saved.name, period_number: saved.period_number },
    });

    return this.toDto(saved);
  }

  async findAll(schoolId: string, academicYearId: string): Promise<TimetablePeriodDto[]> {
    const periods = await this.periodRepo.find({
      where: { school_id: schoolId, academic_year_id: academicYearId },
      order: { period_number: 'ASC' },
    });
    return periods.map((p) => this.toDto(p));
  }

  async findOne(id: string, schoolId: string): Promise<TimetablePeriodDto> {
    const period = await this.periodRepo.findOne({ where: { id, school_id: schoolId } });
    if (!period) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable period not found.' } });
    }
    return this.toDto(period);
  }

  async update(id: string, dto: UpdateTimetablePeriodDto, user: AuthUser): Promise<TimetablePeriodDto> {
    const period = await this.periodRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!period) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable period not found.' } });
    }

    if (dto.period_number && dto.period_number !== period.period_number) {
      const conflict = await this.periodRepo.findOne({
        where: {
          school_id: user.school_id,
          academic_year_id: period.academic_year_id,
          period_number: dto.period_number,
        },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException({
          error: { code: 'CONFLICT', message: `Period number ${dto.period_number} already in use.` },
        });
      }
    }

    const startTime = dto.start_time ?? period.start_time;
    const endTime   = dto.end_time   ?? period.end_time;
    if (startTime >= endTime) {
      throw new BadRequestException({
        error: { code: 'INVALID_TIME_RANGE', message: 'start_time must be before end_time.' },
      });
    }

    const old = { name: period.name, period_number: period.period_number };
    if (dto.name          !== undefined) period.name          = dto.name;
    if (dto.period_number !== undefined) period.period_number = dto.period_number;
    if (dto.start_time    !== undefined) period.start_time    = dto.start_time;
    if (dto.end_time      !== undefined) period.end_time      = dto.end_time;
    if (dto.is_break      !== undefined) period.is_break      = dto.is_break;
    if (dto.is_active     !== undefined) period.is_active     = dto.is_active;

    const saved = await this.periodRepo.save(period);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'timetable_period',
      resource_id: id,
      actor_id: user.id,
      old_value: old,
      new_value: { name: saved.name, period_number: saved.period_number },
    });

    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const period = await this.periodRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!period) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable period not found.' } });
    }
    await this.periodRepo.delete(id);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'timetable_period',
      resource_id: id,
      actor_id: user.id,
      old_value: { name: period.name, period_number: period.period_number },
    });
  }

  private toDto(p: TimetablePeriodEntity): TimetablePeriodDto {
    return {
      id: p.id,
      school_id: p.school_id,
      academic_year_id: p.academic_year_id,
      name: p.name,
      period_number: p.period_number,
      start_time: p.start_time,
      end_time: p.end_time,
      is_break: p.is_break,
      is_active: p.is_active,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
    };
  }
}
