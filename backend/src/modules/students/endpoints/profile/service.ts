import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfileEntity } from '../../entities/student-profile.entity';
import { StudentEntity } from '../../entities/student.entity';
import type { UpsertProfileDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(StudentProfileEntity)
    private readonly profileRepo: Repository<StudentProfileEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  async findByStudent(studentId: string, schoolId: string): Promise<StudentProfileEntity | null> {
    const student = await this.studentRepo.findOne({ where: { id: studentId, school_id: schoolId } });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    const profile = await this.profileRepo.findOne({ where: { student_id: studentId, school_id: schoolId } });
    return profile;
  }

  async upsert(studentId: string, dto: UpsertProfileDto, user: AuthUser): Promise<StudentProfileEntity> {
    const student = await this.studentRepo.findOne({ where: { id: studentId, school_id: user.school_id } });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    let profile = await this.profileRepo.findOne({ where: { student_id: studentId, school_id: user.school_id } });
    if (!profile) {
      profile = this.profileRepo.create({ student_id: studentId, school_id: user.school_id });
    }
    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }
}
