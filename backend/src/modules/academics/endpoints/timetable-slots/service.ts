import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimetableSlotEntity } from '../../entities/timetable-slot.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateTimetableSlotDto, UpdateTimetableSlotDto } from './dto/request.dto';
import type { TimetableSlotDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

export interface TimetableSlotFilters {
  academic_year_id: string;
  class_section_id?: string;
  staff_id?: string;
  day_of_week?: number;
}

@Injectable()
export class TimetableSlotsService {
  constructor(
    @InjectRepository(TimetableSlotEntity)
    private readonly slotRepo: Repository<TimetableSlotEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTimetableSlotDto, user: AuthUser): Promise<TimetableSlotDto> {
    const existing = await this.slotRepo.findOne({
      where: {
        school_id: user.school_id,
        class_section_id: dto.class_section_id,
        timetable_period_id: dto.timetable_period_id,
        day_of_week: dto.day_of_week,
      },
    });
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: 'A slot already exists for this class-section, period, and day.',
        },
      });
    }

    const slot = this.slotRepo.create({
      school_id: user.school_id,
      academic_year_id: dto.academic_year_id,
      class_section_id: dto.class_section_id,
      timetable_period_id: dto.timetable_period_id,
      day_of_week: dto.day_of_week,
      subject_id: dto.subject_id ?? null,
      staff_id: dto.staff_id ?? null,
      is_free_period: dto.is_free_period ?? false,
      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,
    });
    const saved = await this.slotRepo.save(slot);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'timetable_slot',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: {
        class_section_id: saved.class_section_id,
        day_of_week: saved.day_of_week,
        timetable_period_id: saved.timetable_period_id,
      },
    });

    return this.toDto(saved);
  }

  async findAll(schoolId: string, filters: TimetableSlotFilters): Promise<TimetableSlotDto[]> {
    const where: Record<string, unknown> = {
      school_id: schoolId,
      academic_year_id: filters.academic_year_id,
    };
    if (filters.class_section_id) where['class_section_id'] = filters.class_section_id;
    if (filters.staff_id)         where['staff_id']         = filters.staff_id;
    if (filters.day_of_week)      where['day_of_week']      = filters.day_of_week;

    const slots = await this.slotRepo.find({
      where: where as any,
      order: { day_of_week: 'ASC' },
    });
    return slots.map((s) => this.toDto(s));
  }

  async findOne(id: string, schoolId: string): Promise<TimetableSlotDto> {
    const slot = await this.slotRepo.findOne({ where: { id, school_id: schoolId } });
    if (!slot) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable slot not found.' } });
    }
    return this.toDto(slot);
  }

  async update(id: string, dto: UpdateTimetableSlotDto, user: AuthUser): Promise<TimetableSlotDto> {
    const slot = await this.slotRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!slot) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable slot not found.' } });
    }

    const old = { subject_id: slot.subject_id, staff_id: slot.staff_id };
    if (dto.subject_id    !== undefined) slot.subject_id    = dto.subject_id ?? null;
    if (dto.staff_id      !== undefined) slot.staff_id      = dto.staff_id ?? null;
    if (dto.is_free_period !== undefined) slot.is_free_period = dto.is_free_period;
    if (dto.effective_from !== undefined) slot.effective_from = dto.effective_from ?? null;
    if (dto.effective_to   !== undefined) slot.effective_to   = dto.effective_to ?? null;

    const saved = await this.slotRepo.save(slot);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'timetable_slot',
      resource_id: id,
      actor_id: user.id,
      old_value: old,
      new_value: { subject_id: saved.subject_id, staff_id: saved.staff_id },
    });

    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const slot = await this.slotRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!slot) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Timetable slot not found.' } });
    }
    await this.slotRepo.delete(id);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'timetable_slot',
      resource_id: id,
      actor_id: user.id,
      old_value: { class_section_id: slot.class_section_id, day_of_week: slot.day_of_week },
    });
  }

  private toDto(s: TimetableSlotEntity): TimetableSlotDto {
    return {
      id: s.id,
      school_id: s.school_id,
      academic_year_id: s.academic_year_id,
      class_section_id: s.class_section_id,
      timetable_period_id: s.timetable_period_id,
      day_of_week: s.day_of_week,
      subject_id: s.subject_id,
      staff_id: s.staff_id,
      is_free_period: s.is_free_period,
      effective_from: s.effective_from,
      effective_to: s.effective_to,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString(),
    };
  }
}
