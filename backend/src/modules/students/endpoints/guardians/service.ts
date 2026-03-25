import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuardianEntity } from '../../entities/guardian.entity';
import { StudentGuardianEntity } from '../../entities/student-guardian.entity';
import { StudentEntity } from '../../entities/student.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateGuardianDto, UpdateGuardianDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

export interface GuardianWithLink extends GuardianEntity {
  is_primary: boolean;
  emergency_contact: boolean;
}

@Injectable()
export class GuardiansService {
  constructor(
    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,
    @InjectRepository(StudentGuardianEntity)
    private readonly linkRepo: Repository<StudentGuardianEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    private readonly auditService: AuditService,
  ) {}

  private async verifyStudent(studentId: string, schoolId: string): Promise<void> {
    const student = await this.studentRepo.findOne({ where: { id: studentId, school_id: schoolId } });
    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
  }

  async findAll(studentId: string, schoolId: string): Promise<GuardianWithLink[]> {
    await this.verifyStudent(studentId, schoolId);
    const links = await this.linkRepo.find({ where: { student_id: studentId, school_id: schoolId } });
    if (!links.length) return [];
    const guardianIds = links.map((l) => l.guardian_id);
    const guardians = await this.guardianRepo.findByIds(guardianIds);
    return guardians.map((g) => {
      const link = links.find((l) => l.guardian_id === g.id)!;
      return { ...g, is_primary: link.is_primary, emergency_contact: link.emergency_contact };
    });
  }

  async create(studentId: string, dto: CreateGuardianDto, user: AuthUser): Promise<GuardianWithLink> {
    await this.verifyStudent(studentId, user.school_id);
    const guardian = this.guardianRepo.create({
      school_id: user.school_id,
      relation: dto.relation,
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      email: dto.email ?? null,
      occupation: dto.occupation ?? null,
      aadhaar_no: dto.aadhaar_no ?? null,
    });
    const savedGuardian = await this.guardianRepo.save(guardian);
    const link = this.linkRepo.create({
      student_id: studentId,
      guardian_id: savedGuardian.id,
      school_id: user.school_id,
      is_primary: dto.is_primary ?? false,
      emergency_contact: dto.emergency_contact ?? false,
    });
    const savedLink = await this.linkRepo.save(link);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'guardian',
      resource_id: savedGuardian.id,
      actor_id: user.id,
      new_value: { student_id: studentId, relation: dto.relation },
    });
    return { ...savedGuardian, is_primary: savedLink.is_primary, emergency_contact: savedLink.emergency_contact };
  }

  async update(studentId: string, guardianId: string, dto: UpdateGuardianDto, user: AuthUser): Promise<GuardianWithLink> {
    await this.verifyStudent(studentId, user.school_id);
    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId, school_id: user.school_id } });
    if (!guardian) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Guardian not found.' } });
    }
    const link = await this.linkRepo.findOne({ where: { student_id: studentId, guardian_id: guardianId, school_id: user.school_id } });
    if (!link) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Guardian not linked to this student.' } });
    }
    const { is_primary, emergency_contact, ...guardianFields } = dto;
    Object.assign(guardian, guardianFields);
    if (is_primary !== undefined) link.is_primary = is_primary;
    if (emergency_contact !== undefined) link.emergency_contact = emergency_contact;
    const [savedGuardian, savedLink] = await Promise.all([
      this.guardianRepo.save(guardian),
      this.linkRepo.save(link),
    ]);
    return { ...savedGuardian, is_primary: savedLink.is_primary, emergency_contact: savedLink.emergency_contact };
  }

  async remove(studentId: string, guardianId: string, user: AuthUser): Promise<void> {
    await this.verifyStudent(studentId, user.school_id);
    const link = await this.linkRepo.findOne({ where: { student_id: studentId, guardian_id: guardianId, school_id: user.school_id } });
    if (!link) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Guardian not linked to this student.' } });
    }
    await this.linkRepo.remove(link);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'student_guardian_link',
      resource_id: guardianId,
      actor_id: user.id,
      new_value: { student_id: studentId },
    });
  }
}
