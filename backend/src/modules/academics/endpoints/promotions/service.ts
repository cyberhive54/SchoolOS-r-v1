import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ClassSectionEntity } from '../../entities/class-section.entity';
import { AcademicYearEntity } from '../../entities/academic-year.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { BulkPromoteDto } from './dto/request.dto';
import type { PromotionJobDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

export const PROMOTION_QUEUE = 'academics.promotion';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(ClassSectionEntity)
    private readonly cSectionRepo: Repository<ClassSectionEntity>,
    @InjectRepository(AcademicYearEntity)
    private readonly yearRepo: Repository<AcademicYearEntity>,
    @InjectQueue(PROMOTION_QUEUE)
    private readonly promotionQueue: Queue,
    private readonly auditService: AuditService,
  ) {}

  async bulkPromote(
    dto: BulkPromoteDto,
    user: AuthUser,
    idempotencyKey: string,
  ): Promise<PromotionJobDto> {
    const [fromYear, toYear] = await Promise.all([
      this.yearRepo.findOne({ where: { id: dto.from_academic_year_id, school_id: user.school_id } }),
      this.yearRepo.findOne({ where: { id: dto.to_academic_year_id, school_id: user.school_id } }),
    ]);

    if (!fromYear) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Source academic year not found.' } });
    }
    if (!toYear) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Target academic year not found.' } });
    }

    const uniqueFromSections = [...new Set(dto.promotions.map((p) => p.from_class_section_id))];
    const uniqueToSections = [...new Set(dto.promotions.map((p) => p.to_class_section_id))];
    const allSectionIds = [...new Set([...uniqueFromSections, ...uniqueToSections])];

    const sections = await Promise.all(
      allSectionIds.map((id) =>
        this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } }),
      ),
    );

    const missingSections = allSectionIds.filter((id, idx) => !sections[idx]);
    if (missingSections.length > 0) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: `Class-sections not found: ${missingSections.join(', ')}` },
      });
    }

    const existingJob = await this.promotionQueue.getJob(idempotencyKey);
    if (existingJob) {
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'A promotion job with this idempotency key already exists.',
          job_id: existingJob.id,
        },
      });
    }

    const job = await this.promotionQueue.add(
      'bulk-promote',
      {
        school_id: user.school_id,
        actor_id: user.id,
        from_academic_year_id: dto.from_academic_year_id,
        to_academic_year_id: dto.to_academic_year_id,
        promotions: dto.promotions,
      },
      { jobId: idempotencyKey },
    );

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'promotion_job',
      resource_id: String(job.id),
      actor_id: user.id,
      new_value: {
        from_year: fromYear.name,
        to_year: toYear.name,
        total: dto.promotions.length,
      },
    });

    return {
      job_id: String(job.id),
      status: 'queued',
      total: dto.promotions.length,
      message: `Promotion job queued for ${dto.promotions.length} student(s). Poll /academics/promotions/jobs/${job.id} for status.`,
    };
  }
}
