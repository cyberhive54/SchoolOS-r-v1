import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSectionEntity } from '../../entities/class-section.entity';
import { ClassEntity } from '../../entities/class.entity';
import { SectionEntity } from '../../entities/section.entity';
import { AcademicYearEntity } from '../../entities/academic-year.entity';
import { ClassSectionSubjectEntity } from '../../entities/class-section-subject.entity';
import { ClassTeacherAssignmentEntity } from '../../entities/class-teacher-assignment.entity';
import { TeacherSubjectAssignmentEntity } from '../../entities/teacher-subject-assignment.entity';
import { SubjectEntity } from '../../entities/subject.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateClassSectionDto, UpdateClassSectionDto } from './dto/request.dto';
import type { ClassSectionDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';
import { IsNull } from 'typeorm';

@Injectable()
export class ClassSectionsService {
  constructor(
    @InjectRepository(ClassSectionEntity)
    private readonly cSectionRepo: Repository<ClassSectionEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(SectionEntity)
    private readonly sectionRepo: Repository<SectionEntity>,
    @InjectRepository(AcademicYearEntity)
    private readonly yearRepo: Repository<AcademicYearEntity>,
    @InjectRepository(ClassSectionSubjectEntity)
    private readonly cssRepo: Repository<ClassSectionSubjectEntity>,
    @InjectRepository(ClassTeacherAssignmentEntity)
    private readonly ctaRepo: Repository<ClassTeacherAssignmentEntity>,
    @InjectRepository(TeacherSubjectAssignmentEntity)
    private readonly tsaRepo: Repository<TeacherSubjectAssignmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateClassSectionDto, user: AuthUser): Promise<ClassSectionDto> {
    // Tenant-scope validation: referenced FKs must belong to the same school
    const [cls, section, year] = await Promise.all([
      this.classRepo.findOne({ where: { id: dto.class_id, school_id: user.school_id } }),
      this.sectionRepo.findOne({ where: { id: dto.section_id, school_id: user.school_id } }),
      this.yearRepo.findOne({ where: { id: dto.academic_year_id, school_id: user.school_id } }),
    ]);
    if (!cls) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class not found in this school.' } });
    if (!section) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Section not found in this school.' } });
    if (!year) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Academic year not found in this school.' } });

    const existing = await this.cSectionRepo.findOne({
      where: {
        school_id: user.school_id,
        class_id: dto.class_id,
        section_id: dto.section_id,
        academic_year_id: dto.academic_year_id,
      },
    });
    if (existing) {
      throw new ConflictException({ error: { code: 'CONFLICT', message: 'This class-section combination already exists for this academic year.' } });
    }

    const cs = this.cSectionRepo.create({
      school_id: user.school_id,
      class_id: dto.class_id,
      section_id: dto.section_id,
      academic_year_id: dto.academic_year_id,
      capacity: dto.capacity ?? null,
      room_no: dto.room_no ?? null,
    });
    const saved = await this.cSectionRepo.save(cs);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'class_section',
      resource_id: saved.id,
      actor_id: user.id,
    });

    return this.enrichOne(saved, user.school_id);
  }

  async findAll(schoolId: string, filters: { academic_year_id?: string; class_id?: string }): Promise<ClassSectionDto[]> {
    const where: Record<string, string> = { school_id: schoolId };
    if (filters.academic_year_id) where['academic_year_id'] = filters.academic_year_id;
    if (filters.class_id) where['class_id'] = filters.class_id;

    const list = await this.cSectionRepo.find({ where, order: { created_at: 'ASC' } });
    return Promise.all(list.map((cs) => this.enrichOne(cs, schoolId)));
  }

  async findOne(id: string, schoolId: string): Promise<ClassSectionDto> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: schoolId } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    return this.enrichOne(cs, schoolId);
  }

  async update(id: string, dto: UpdateClassSectionDto, user: AuthUser): Promise<ClassSectionDto> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    if (dto.capacity !== undefined) cs.capacity = dto.capacity;
    if (dto.room_no !== undefined) cs.room_no = dto.room_no;
    const saved = await this.cSectionRepo.save(cs);
    return this.enrichOne(saved, user.school_id);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    await this.cSectionRepo.remove(cs);
    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'class_section', resource_id: id, actor_id: user.id });
  }

  // Subject assignments
  async assignSubject(id: string, subjectId: string, user: AuthUser): Promise<void> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    const subject = await this.subjectRepo.findOne({ where: { id: subjectId, school_id: user.school_id, deleted_at: IsNull() } });
    if (!subject) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject not found.' } });
    const existing = await this.cssRepo.findOne({ where: { class_section_id: id, subject_id: subjectId } });
    if (existing) throw new ConflictException({ error: { code: 'CONFLICT', message: 'Subject already assigned to this class-section.' } });
    const item = this.cssRepo.create({ school_id: user.school_id, class_section_id: id, subject_id: subjectId });
    await this.cssRepo.save(item);
  }

  async removeSubject(id: string, subjectId: string, user: AuthUser): Promise<void> {
    const item = await this.cssRepo.findOne({ where: { class_section_id: id, subject_id: subjectId, school_id: user.school_id } });
    if (!item) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Subject assignment not found.' } });
    await this.cssRepo.remove(item);
  }

  async getSubjects(id: string, schoolId: string) {
    const items = await this.cssRepo.find({ where: { class_section_id: id, school_id: schoolId } });
    const subjectIds = items.map((i) => i.subject_id);
    if (!subjectIds.length) return [];
    return Promise.all(
      subjectIds.map(async (sid) => {
        const s = await this.subjectRepo.findOne({ where: { id: sid, deleted_at: IsNull() } });
        return s ? { id: s.id, name: s.name, code: s.code, type: s.type } : null;
      }),
    ).then((arr) => arr.filter(Boolean));
  }

  // Class teacher assignment
  async assignClassTeacher(id: string, userId: string, user: AuthUser): Promise<void> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    await this.ctaRepo.delete({ school_id: user.school_id, class_section_id: id });
    const item = this.ctaRepo.create({ school_id: user.school_id, class_section_id: id, user_id: userId });
    await this.ctaRepo.save(item);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'class_teacher_assignment', resource_id: id, actor_id: user.id, new_value: { user_id: userId } });
  }

  async removeClassTeacher(id: string, user: AuthUser): Promise<void> {
    const existing = await this.ctaRepo.findOne({ where: { school_id: user.school_id, class_section_id: id } });
    if (!existing) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'No class teacher assigned.' } });
    await this.ctaRepo.remove(existing);
  }

  // Subject teacher assignments
  async assignSubjectTeacher(id: string, subjectId: string, userId: string, user: AuthUser): Promise<void> {
    const cs = await this.cSectionRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!cs) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class-section not found.' } });
    const existing = await this.tsaRepo.findOne({ where: { school_id: user.school_id, class_section_id: id, subject_id: subjectId } });
    if (existing) {
      existing.user_id = userId;
      await this.tsaRepo.save(existing);
    } else {
      const item = this.tsaRepo.create({ school_id: user.school_id, class_section_id: id, subject_id: subjectId, user_id: userId });
      await this.tsaRepo.save(item);
    }
  }

  /**
   * Remove a subject teacher assignment by the assignment's own UUID (assignmentId).
   * The class_section_id (id) is scoped for tenant safety.
   */
  async removeSubjectTeacher(id: string, assignmentId: string, user: AuthUser): Promise<void> {
    const item = await this.tsaRepo.findOne({
      where: { id: assignmentId, school_id: user.school_id, class_section_id: id },
    });
    if (!item) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Assignment not found.' } });
    }
    await this.tsaRepo.remove(item);
  }

  /**
   * Bulk list of all subject-teacher assignments for a school, optionally filtered by academic year.
   * Returns assignment id so clients can pass it to DELETE /:id/subject-teachers/:assignmentId.
   */
  async listAllSubjectTeachers(
    schoolId: string,
    filters: { academic_year_id?: string },
  ): Promise<{ id: string; class_section_id: string; subject_id: string; user_id: string }[]> {
    const qb = this.tsaRepo
      .createQueryBuilder('tsa')
      .where('tsa.school_id = :school_id', { school_id: schoolId });

    if (filters.academic_year_id) {
      qb.innerJoin(
        ClassSectionEntity,
        'cs',
        'cs.id = tsa.class_section_id AND cs.academic_year_id = :year_id',
        { year_id: filters.academic_year_id },
      );
    }

    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      class_section_id: r.class_section_id,
      subject_id: r.subject_id,
      user_id: r.user_id,
    }));
  }

  async getTeachers(id: string, schoolId: string) {
    const classTeacher = await this.ctaRepo.findOne({ where: { school_id: schoolId, class_section_id: id } });
    const subjectTeachers = await this.tsaRepo.find({ where: { school_id: schoolId, class_section_id: id } });
    return {
      class_teacher: classTeacher ? { user_id: classTeacher.user_id } : null,
      subject_teachers: subjectTeachers.map((st) => ({ id: st.id, subject_id: st.subject_id, user_id: st.user_id })),
    };
  }

  private async enrichOne(cs: ClassSectionEntity, schoolId: string): Promise<ClassSectionDto> {
    const [cls, section, year, cta] = await Promise.all([
      this.classRepo.findOne({ where: { id: cs.class_id } }),
      this.sectionRepo.findOne({ where: { id: cs.section_id } }),
      this.yearRepo.findOne({ where: { id: cs.academic_year_id } }),
      this.ctaRepo.findOne({ where: { school_id: schoolId, class_section_id: cs.id } }),
    ]);
    return {
      id: cs.id,
      school_id: cs.school_id,
      class_id: cs.class_id,
      section_id: cs.section_id,
      academic_year_id: cs.academic_year_id,
      capacity: cs.capacity,
      room_no: cs.room_no,
      class_name: cls?.name,
      section_name: section?.name,
      academic_year_name: year?.name,
      class_teacher: cta ? { user_id: cta.user_id, name: cta.user_id } : null,
      created_at: cs.created_at.toISOString(),
      updated_at: cs.updated_at.toISOString(),
    };
  }
}
