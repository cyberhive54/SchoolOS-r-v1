import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYearEntity } from '../../entities/academic-year.entity';
import { ClassSectionEntity } from '../../entities/class-section.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/request.dto';
import type { AcademicYearDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class YearsService {
  constructor(
    @InjectRepository(AcademicYearEntity)
    private readonly yearRepo: Repository<AcademicYearEntity>,
    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateAcademicYearDto, user: AuthUser): Promise<AcademicYearDto> {
    const existing = await this.yearRepo.findOne({
      where: { school_id: user.school_id, name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: `Academic year '${dto.name}' already exists.` },
      });
    }

    const year = this.yearRepo.create({
      school_id: user.school_id,
      name: dto.name,
      start_date: dto.start_date,
      end_date: dto.end_date,
      is_current: false,
    });
    const saved = await this.yearRepo.save(year);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'academic_year',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { name: saved.name },
    });

    return this.toDto(saved);
  }

  async findAll(schoolId: string): Promise<AcademicYearDto[]> {
    const years = await this.yearRepo.find({
      where: { school_id: schoolId },
      order: { start_date: 'DESC' },
    });
    return years.map((y) => this.toDto(y));
  }

  async findOne(id: string, schoolId: string): Promise<AcademicYearDto> {
    const year = await this.yearRepo.findOne({ where: { id, school_id: schoolId } });
    if (!year) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Academic year not found.' } });
    }
    return this.toDto(year);
  }

  async update(id: string, dto: UpdateAcademicYearDto, user: AuthUser): Promise<AcademicYearDto> {
    const year = await this.yearRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!year) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Academic year not found.' } });
    }

    if (dto.name && dto.name !== year.name) {
      const conflict = await this.yearRepo.findOne({
        where: { school_id: user.school_id, name: dto.name },
      });
      if (conflict) {
        throw new ConflictException({
          error: { code: 'CONFLICT', message: `Academic year '${dto.name}' already exists.` },
        });
      }
    }

    const old = { ...year };
    if (dto.name !== undefined) year.name = dto.name;
    if (dto.start_date !== undefined) year.start_date = dto.start_date;
    if (dto.end_date !== undefined) year.end_date = dto.end_date;

    const saved = await this.yearRepo.save(year);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'academic_year',
      resource_id: saved.id,
      actor_id: user.id,
      old_value: { name: old.name },
      new_value: { name: saved.name },
    });

    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const year = await this.yearRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!year) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Academic year not found.' } });
    }

    const inUse = await this.classSectionRepo.count({
      where: { school_id: user.school_id, academic_year_id: id },
    });
    if (inUse > 0) {
      throw new BadRequestException({
        error: {
          code: 'ACADEMIC_YEAR_IN_USE',
          message: 'Cannot delete — class sections reference this academic year.',
        },
      });
    }

    await this.yearRepo.remove(year);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'academic_year',
      resource_id: id,
      actor_id: user.id,
      old_value: { name: year.name },
    });
  }

  async setCurrent(id: string, user: AuthUser): Promise<AcademicYearDto> {
    const year = await this.yearRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!year) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Academic year not found.' } });
    }

    await this.yearRepo
      .createQueryBuilder()
      .update()
      .set({ is_current: false })
      .where('school_id = :schoolId', { schoolId: user.school_id })
      .execute();

    year.is_current = true;
    const saved = await this.yearRepo.save(year);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'academic_year',
      resource_id: id,
      actor_id: user.id,
      new_value: { is_current: true },
    });

    return this.toDto(saved);
  }

  private toDto(y: AcademicYearEntity): AcademicYearDto {
    return {
      id: y.id,
      school_id: y.school_id,
      name: y.name,
      start_date: y.start_date,
      end_date: y.end_date,
      is_current: y.is_current,
      created_at: y.created_at.toISOString(),
      updated_at: y.updated_at.toISOString(),
    };
  }
}
