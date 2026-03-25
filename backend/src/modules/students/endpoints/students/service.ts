import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudentEntity } from '../../entities/student.entity';
import { StudentEnrollmentEntity } from '../../entities/student-enrollment.entity';
import { StudentGuardianEntity } from '../../entities/student-guardian.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import { PLATFORM } from '@schoolos/config';
import type { CreateStudentDto, UpdateStudentDto, ListStudentsQueryDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

export interface PaginatedStudents {
  items: StudentEntity[];
  total: number;
  page: number;
  per_page: number;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(StudentEnrollmentEntity)
    private readonly enrollmentRepo: Repository<StudentEnrollmentEntity>,
    @InjectRepository(StudentGuardianEntity)
    private readonly guardianLinkRepo: Repository<StudentGuardianEntity>,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateStudentDto, user: AuthUser): Promise<StudentEntity> {
    const existing = await this.studentRepo.findOne({
      where: { school_id: user.school_id, admission_no: dto.admission_no },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: `Admission number '${dto.admission_no}' already exists.` },
      });
    }

    const student = this.studentRepo.create({
      school_id: user.school_id,
      admission_no: dto.admission_no,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name,
      date_of_birth: dto.date_of_birth,
      gender: dto.gender,
      blood_group: dto.blood_group ?? null,
      religion: dto.religion ?? null,
      caste: dto.caste ?? null,
      nationality: dto.nationality ?? 'Indian',
      aadhaar_no: dto.aadhaar_no ?? null,
      category_id: dto.category_id ?? null,
      house_id: dto.house_id ?? null,
      status: 'active',
    });
    const saved = await this.studentRepo.save(student);

    if (dto.enrollment) {
      const enrollment = this.enrollmentRepo.create({
        student_id: saved.id,
        school_id: user.school_id,
        class_section_id: dto.enrollment.class_section_id,
        academic_year_id: dto.enrollment.academic_year_id,
        roll_number: dto.enrollment.roll_number ?? null,
        status: 'active',
      });
      await this.enrollmentRepo.save(enrollment);
    }

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'student',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { admission_no: saved.admission_no, name: `${saved.first_name} ${saved.last_name}` },
    });

    this.eventEmitter.emit('student.created', { student_id: saved.id, school_id: user.school_id });

    return saved;
  }

  async findAll(schoolId: string, query: ListStudentsQueryDto): Promise<PaginatedStudents> {
    const page = Math.max(1, Number(query.page) || 1);
    const per_page = Math.min(PLATFORM.MAX_PAGE_SIZE, Math.max(1, Number(query.per_page) || PLATFORM.DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * per_page;

    const where: FindOptionsWhere<StudentEntity> = { school_id: schoolId };

    if (query.filter?.status) {
      (where as Record<string, unknown>).status = query.filter.status;
    }
    if (query.filter?.gender) {
      (where as Record<string, unknown>).gender = query.filter.gender;
    }
    if (query.filter?.category_id) {
      (where as Record<string, unknown>).category_id = query.filter.category_id;
    }

    const qb = this.studentRepo.createQueryBuilder('s')
      .where('s.school_id = :schoolId', { schoolId })
      .andWhere('s.deleted_at IS NULL');

    if (query.q) {
      qb.andWhere(
        `(s.first_name ILIKE :q OR s.last_name ILIKE :q OR s.admission_no ILIKE :q OR CONCAT(s.first_name, ' ', s.last_name) ILIKE :q)`,
        { q: `%${query.q}%` },
      );
    }

    if (query.filter?.gender) {
      qb.andWhere('s.gender = :gender', { gender: query.filter.gender });
    }

    if (query.filter?.status) {
      qb.andWhere('s.status = :status', { status: query.filter.status });
    }

    if (query.filter?.category_id) {
      qb.andWhere('s.category_id = :categoryId', { categoryId: query.filter.category_id });
    }

    if (query.filter?.class_section_id || query.filter?.academic_year_id) {
      qb.innerJoin(
        'student_enrollments',
        'se',
        'se.student_id = s.id AND se.school_id = s.school_id AND se.status = :enrollStatus',
        { enrollStatus: 'active' },
      );
      if (query.filter.class_section_id) {
        qb.andWhere('se.class_section_id = :classSectionId', { classSectionId: query.filter.class_section_id });
      }
      if (query.filter.academic_year_id) {
        qb.andWhere('se.academic_year_id = :academicYearId', { academicYearId: query.filter.academic_year_id });
      }
    }

    const validSortFields: Record<string, string> = {
      last_name: 's.last_name',
      first_name: 's.first_name',
      admission_no: 's.admission_no',
      created_at: 's.created_at',
    };
    const sortField = validSortFields[query.sort ?? 'last_name'] ?? 's.last_name';
    const sortOrder = query.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder).skip(skip).take(per_page);

    const [students, total] = await qb.getManyAndCount();

    return { items: students, total, page, per_page };
  }

  async findOne(id: string, schoolId: string): Promise<StudentEntity & { guardian_count?: number }> {
    const student = await this.studentRepo.findOne({
      where: { id, school_id: schoolId },
    });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    const guardianCount = await this.guardianLinkRepo.count({
      where: { student_id: id, school_id: schoolId },
    });
    return { ...student, guardian_count: guardianCount };
  }

  async update(id: string, dto: UpdateStudentDto, user: AuthUser): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({
      where: { id, school_id: user.school_id },
    });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    const old = { ...student };
    Object.assign(student, dto as object);
    const saved = await this.studentRepo.save(student);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'student',
      resource_id: id,
      actor_id: user.id,
      old_value: old,
      new_value: dto as Record<string, unknown>,
    });
    this.eventEmitter.emit('student.updated', { student_id: id, school_id: user.school_id });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const student = await this.studentRepo.findOne({
      where: { id, school_id: user.school_id },
    });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    student.status = 'inactive';
    student.deleted_at = new Date();
    await this.studentRepo.save(student);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'student',
      resource_id: id,
      actor_id: user.id,
    });
    this.eventEmitter.emit('student.deactivated', { student_id: id, school_id: user.school_id });
  }
}
