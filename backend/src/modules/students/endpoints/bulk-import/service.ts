import {
  Injectable,
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { AuthUser } from '@schoolos/types';

export const STUDENTS_BULK_IMPORT_QUEUE = 'students-bulk-import';

export interface BulkImportResult {
  job_id: string;
  message: string;
}

@Injectable()
export class BulkImportService {
  private readonly usedIdempotencyKeys = new Set<string>();

  constructor(
    @InjectQueue(STUDENTS_BULK_IMPORT_QUEUE)
    private readonly queue: Queue,
  ) {}

  async startImport(
    file: Express.Multer.File | undefined,
    idempotencyKey: string,
    user: AuthUser,
  ): Promise<BulkImportResult> {
    if (!file) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'CSV file is required.' },
      });
    }

    if (!file.originalname.endsWith('.csv') && file.mimetype !== 'text/csv') {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Only CSV files are accepted.' },
      });
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'File size must not exceed 2MB.' },
      });
    }

    if (this.usedIdempotencyKeys.has(idempotencyKey)) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: 'Idempotency key already used.' },
      });
    }
    this.usedIdempotencyKeys.add(idempotencyKey);

    const job = await this.queue.add(
      'process-csv',
      {
        csv_content: file.buffer.toString('utf-8'),
        school_id: user.school_id,
        uploaded_by: user.id,
        idempotency_key: idempotencyKey,
      },
      {
        jobId: idempotencyKey,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: false,
      },
    );

    return {
      job_id: job.id as string,
      message: 'Bulk import job queued. Poll GET /v1/jobs/:job_id for status.',
    };
  }

  getTemplate(): string {
    return [
      'admission_no,first_name,middle_name,last_name,date_of_birth,gender,blood_group,religion,category_code,house_name,academic_year_id,class_section_id,roll_number',
      '2025001,Arjun,,Sharma,2015-04-01,male,O+,Hindu,GEN,Red House,,,'
    ].join('\n');
  }
}
