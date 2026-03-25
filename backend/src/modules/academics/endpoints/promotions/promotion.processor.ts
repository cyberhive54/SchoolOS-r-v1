import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PROMOTION_QUEUE } from './service';

export interface PromotionJobPayload {
  school_id: string;
  actor_id: string;
  from_academic_year_id: string;
  to_academic_year_id: string;
  promotions: Array<{
    student_id: string;
    from_class_section_id: string;
    to_class_section_id: string;
    status: 'promoted' | 'detained' | 'transferred_out';
  }>;
}

export interface PromotionJobResult {
  promoted: number;
  detained: number;
  transferred_out: number;
  failed: number;
  errors: Array<{ student_id: string; reason: string }>;
}

@Processor(PROMOTION_QUEUE)
export class PromotionProcessor extends WorkerHost {
  private readonly logger = new Logger(PromotionProcessor.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async process(job: Job<PromotionJobPayload>): Promise<PromotionJobResult> {
    this.logger.log(`Processing promotion job ${job.id} for school ${job.data.school_id}`);

    const result: PromotionJobResult = {
      promoted: 0,
      detained: 0,
      transferred_out: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < job.data.promotions.length; i++) {
      const item = job.data.promotions[i];
      try {
        if (item.status === 'promoted') result.promoted++;
        else if (item.status === 'detained') result.detained++;
        else if (item.status === 'transferred_out') result.transferred_out++;

        this.eventEmitter.emit('student.promoted', {
          school_id: job.data.school_id,
          student_id: item.student_id,
          from_class_section_id: item.from_class_section_id,
          to_class_section_id: item.to_class_section_id,
          status: item.status,
          from_academic_year_id: job.data.from_academic_year_id,
          to_academic_year_id: job.data.to_academic_year_id,
          actor_id: job.data.actor_id,
          job_id: job.id,
        });

        await job.updateProgress(Math.round(((i + 1) / job.data.promotions.length) * 100));
      } catch (err) {
        result.failed++;
        result.errors.push({
          student_id: item.student_id,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Promotion job ${job.id} complete: promoted=${result.promoted} detained=${result.detained} failed=${result.failed}`,
    );

    return result;
  }
}
