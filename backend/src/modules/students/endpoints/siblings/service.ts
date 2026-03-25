import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentSiblingEntity } from '../../entities/student-sibling.entity';
import { StudentEntity } from '../../entities/student.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { LinkSiblingDto } from './dto/request.dto';
import type { StudentSiblingDetailDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class SiblingsService {
  constructor(
    @InjectRepository(StudentSiblingEntity)
    private readonly siblingRepo: Repository<StudentSiblingEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(studentId: string, schoolId: string): Promise<StudentSiblingDetailDto[]> {
    const rows = await this.siblingRepo.find({
      where: { school_id: schoolId, student_id: studentId },
    });

    const details: StudentSiblingDetailDto[] = [];
    for (const row of rows) {
      const sibling = await this.studentRepo.findOne({
        where: { id: row.sibling_id, school_id: schoolId },
      });
      if (sibling) {
        details.push({
          id: row.id,
          sibling_id: sibling.id,
          first_name: sibling.first_name,
          last_name: sibling.last_name,
          admission_no: sibling.admission_no,
          created_at: row.created_at.toISOString(),
        });
      }
    }
    return details;
  }

  async link(studentId: string, dto: LinkSiblingDto, user: AuthUser): Promise<StudentSiblingDetailDto> {
    if (studentId === dto.sibling_id) {
      throw new BadRequestException({
        error: { code: 'INVALID_INPUT', message: 'A student cannot be their own sibling.' },
      });
    }

    const [student, sibling] = await Promise.all([
      this.studentRepo.findOne({ where: { id: studentId, school_id: user.school_id } }),
      this.studentRepo.findOne({ where: { id: dto.sibling_id, school_id: user.school_id } }),
    ]);

    if (!student) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    if (!sibling) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Sibling student not found.' } });
    }

    // Check if link already exists (idempotent)
    const existing = await this.siblingRepo.findOne({
      where: { school_id: user.school_id, student_id: studentId, sibling_id: dto.sibling_id },
    });
    if (existing) {
      return {
        id: existing.id,
        sibling_id: sibling.id,
        first_name: sibling.first_name,
        last_name: sibling.last_name,
        admission_no: sibling.admission_no,
        created_at: existing.created_at.toISOString(),
      };
    }

    // Create bi-directional link
    const forward  = this.siblingRepo.create({ school_id: user.school_id, student_id: studentId,      sibling_id: dto.sibling_id });
    const backward = this.siblingRepo.create({ school_id: user.school_id, student_id: dto.sibling_id, sibling_id: studentId     });
    const [saved] = await this.siblingRepo.save([forward, backward]);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'student_sibling',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { student_id: studentId, sibling_id: dto.sibling_id },
    });

    return {
      id: saved.id,
      sibling_id: sibling.id,
      first_name: sibling.first_name,
      last_name: sibling.last_name,
      admission_no: sibling.admission_no,
      created_at: saved.created_at.toISOString(),
    };
  }

  async unlink(studentId: string, siblingId: string, user: AuthUser): Promise<void> {
    const forward = await this.siblingRepo.findOne({
      where: { school_id: user.school_id, student_id: studentId, sibling_id: siblingId },
    });
    if (!forward) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Sibling link not found.' } });
    }

    // Remove both directions
    await this.siblingRepo.delete({ school_id: user.school_id, student_id: studentId,  sibling_id: siblingId });
    await this.siblingRepo.delete({ school_id: user.school_id, student_id: siblingId,  sibling_id: studentId });

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'student_sibling',
      resource_id: forward.id,
      actor_id: user.id,
      old_value: { student_id: studentId, sibling_id: siblingId },
    });
  }
}
