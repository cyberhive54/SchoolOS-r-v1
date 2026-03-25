import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudentEnrollmentEntity } from '../../entities/student-enrollment.entity';
import { StudentEntity } from '../../entities/student.entity';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(StudentEnrollmentEntity)
    private readonly enrollmentRepo: Repository<StudentEnrollmentEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async verifyStudent(studentId: string, schoolId: string): Promise<void> {
    const student = await this.studentRepo.findOne({ where: { id: studentId, school_id: schoolId } });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
  }

  async create(studentId: string, dto: CreateEnrollmentDto, user: AuthUser): Promise<StudentEnrollmentEntity> {
    await this.verifyStudent(studentId, user.school_id);
    const existing = await this.enrollmentRepo.findOne({
      where: { student_id: studentId, academic_year_id: dto.academic_year_id, status: 'active' },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: 'Student already has an active enrollment for this academic year.' },
      });
    }
    const enrollment = this.enrollmentRepo.create({
      student_id: studentId,
      school_id: user.school_id,
      class_section_id: dto.class_section_id,
      academic_year_id: dto.academic_year_id,
      roll_number: dto.roll_number ?? null,
      status: 'active',
    });
    const saved = await this.enrollmentRepo.save(enrollment);
    this.eventEmitter.emit('student.enrolled', { student_id: studentId, school_id: user.school_id, enrollment_id: saved.id });
    return saved;
  }

  async findAll(studentId: string, schoolId: string): Promise<StudentEnrollmentEntity[]> {
    await this.verifyStudent(studentId, schoolId);
    return this.enrollmentRepo.find({
      where: { student_id: studentId, school_id: schoolId },
      order: { enrolled_at: 'DESC' },
    });
  }

  async update(studentId: string, enrollmentId: string, dto: UpdateEnrollmentDto, user: AuthUser): Promise<StudentEnrollmentEntity> {
    await this.verifyStudent(studentId, user.school_id);
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, student_id: studentId, school_id: user.school_id },
    });
    if (!enrollment) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Enrollment not found.' } });
    }
    Object.assign(enrollment, dto);
    return this.enrollmentRepo.save(enrollment);
  }
}
