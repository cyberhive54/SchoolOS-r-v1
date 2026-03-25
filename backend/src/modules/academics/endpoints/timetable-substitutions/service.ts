import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimetableSubstitutionEntity } from '../../entities/timetable-substitution.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateTimetableSubstitutionDto, UpdateTimetableSubstitutionDto } from './dto/request.dto';
import type { TimetableSubstitutionDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

export interface SubstitutionFilters {
  date?: string;
  absent_staff_id?: string;
}

@Injectable()
export class TimetableSubstitutionsService {
  constructor(
    @InjectRepository(TimetableSubstitutionEntity)
    private readonly subRepo: Repository<TimetableSubstitutionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTimetableSubstitutionDto, user: AuthUser): Promise<TimetableSubstitutionDto> {
    const sub = this.subRepo.create({
      school_id: user.school_id,
      date: dto.date,
      slot_id: dto.slot_id,
      absent_staff_id: dto.absent_staff_id,
      substitute_staff_id: dto.substitute_staff_id ?? null,
      reason: dto.reason ?? null,
      note: dto.note ?? null,
      created_by: user.id,
    });
    const saved = await this.subRepo.save(sub);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'timetable_substitution',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { date: saved.date, absent_staff_id: saved.absent_staff_id },
    });

    return this.toDto(saved);
  }

  async findAll(schoolId: string, filters: SubstitutionFilters): Promise<TimetableSubstitutionDto[]> {
    const where: Record<string, unknown> = { school_id: schoolId };
    if (filters.date)            where['date']            = filters.date;
    if (filters.absent_staff_id) where['absent_staff_id'] = filters.absent_staff_id;

    const subs = await this.subRepo.find({ where: where as any, order: { date: 'DESC' } });
    return subs.map((s) => this.toDto(s));
  }

  async findOne(id: string, schoolId: string): Promise<TimetableSubstitutionDto> {
    const sub = await this.subRepo.findOne({ where: { id, school_id: schoolId } });
    if (!sub) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Substitution record not found.' } });
    }
    return this.toDto(sub);
  }

  async update(id: string, dto: UpdateTimetableSubstitutionDto, user: AuthUser): Promise<TimetableSubstitutionDto> {
    const sub = await this.subRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!sub) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Substitution record not found.' } });
    }

    if (dto.substitute_staff_id !== undefined) sub.substitute_staff_id = dto.substitute_staff_id ?? null;
    if (dto.reason              !== undefined) sub.reason              = dto.reason              ?? null;
    if (dto.note                !== undefined) sub.note                = dto.note                ?? null;

    const saved = await this.subRepo.save(sub);
    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!sub) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Substitution record not found.' } });
    }
    await this.subRepo.delete(id);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'timetable_substitution',
      resource_id: id,
      actor_id: user.id,
      old_value: { date: sub.date, absent_staff_id: sub.absent_staff_id },
    });
  }

  private toDto(s: TimetableSubstitutionEntity): TimetableSubstitutionDto {
    return {
      id: s.id,
      school_id: s.school_id,
      date: s.date,
      slot_id: s.slot_id,
      absent_staff_id: s.absent_staff_id,
      substitute_staff_id: s.substitute_staff_id,
      reason: s.reason,
      note: s.note,
      created_by: s.created_by,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString(),
    };
  }
}
