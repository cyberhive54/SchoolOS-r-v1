import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudentEntity } from '../../entities/student.entity';
import { StudentCategoryEntity } from '../../entities/student-category.entity';
import { StudentHouseEntity } from '../../entities/student-house.entity';
import { STUDENTS_BULK_IMPORT_QUEUE } from './service';

interface CsvRow {
  admission_no: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  religion?: string;
  category_code?: string;
  house_name?: string;
}

@Processor(STUDENTS_BULK_IMPORT_QUEUE, {
  concurrency: 1,
})
export class BulkImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkImportProcessor.name);

  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(StudentCategoryEntity)
    private readonly categoryRepo: Repository<StudentCategoryEntity>,
    @InjectRepository(StudentHouseEntity)
    private readonly houseRepo: Repository<StudentHouseEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ csv_content: string; school_id: string; uploaded_by: string }>): Promise<void> {
    const { csv_content, school_id } = job.data;
    const lines = csv_content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      this.logger.warn(`Job ${job.id}: CSV has no data rows`);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 501);
    let created = 0;
    const errors: { row: number; error: string }[] = [];

    const categories = await this.categoryRepo.find({ where: { school_id } });
    const houses = await this.houseRepo.find({ where: { school_id } });

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: Partial<CsvRow> = {};
      headers.forEach((h, idx) => {
        (row as Record<string, string>)[h] = values[idx] ?? '';
      });

      try {
        if (!row.admission_no || !row.first_name || !row.last_name || !row.date_of_birth || !row.gender) {
          errors.push({ row: i + 2, error: 'Required fields missing' });
          continue;
        }

        const existing = await this.studentRepo.findOne({ where: { school_id, admission_no: row.admission_no } });
        if (existing) {
          errors.push({ row: i + 2, error: `Admission number '${row.admission_no}' already exists` });
          continue;
        }

        const categoryId = row.category_code
          ? (categories.find((c) => c.code === row.category_code)?.id ?? null)
          : null;
        const houseId = row.house_name
          ? (houses.find((h) => h.name === row.house_name)?.id ?? null)
          : null;

        const student = this.studentRepo.create({
          school_id,
          admission_no: row.admission_no,
          first_name: row.first_name,
          middle_name: row.middle_name || null,
          last_name: row.last_name,
          date_of_birth: row.date_of_birth,
          gender: (row.gender as 'male' | 'female' | 'other') ?? 'male',
          blood_group: row.blood_group || null,
          religion: row.religion || null,
          category_id: categoryId,
          house_id: houseId,
          status: 'active',
        });
        await this.studentRepo.save(student);
        created++;
      } catch (err) {
        errors.push({ row: i + 2, error: (err as Error).message });
      }
    }

    this.logger.log(`Job ${job.id}: created=${created}, errors=${errors.length}`);
    this.eventEmitter.emit('students.bulk_import_completed', {
      school_id,
      job_id: job.id,
      created,
      errors,
    });
  }
}
