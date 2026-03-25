import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffEntity } from '../../entities/staff.entity';
import { DepartmentEntity } from '../../entities/department.entity';
import { DesignationEntity } from '../../entities/designation.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import { UserEntity } from '../../../users/entities/user.entity';
import { SchoolMembershipEntity } from '../../../users/entities/school-membership.entity';
import { PLATFORM } from '@schoolos/config';
import type { CreateStaffDto, UpdateStaffDto, ListStaffQueryDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

export interface PaginatedStaff {
  items: StaffEntity[];
  total: number;
  page: number;
  per_page: number;
}

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly deptRepo: Repository<DepartmentEntity>,
    @InjectRepository(DesignationEntity)
    private readonly desRepo: Repository<DesignationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SchoolMembershipEntity)
    private readonly membershipRepo: Repository<SchoolMembershipEntity>,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateStaffDto, user: AuthUser): Promise<StaffEntity> {
    const existing = await this.staffRepo.findOne({
      where: { school_id: user.school_id, employee_id: dto.employee_id },
    });
    if (existing) {
      throw new ConflictException({ error: { code: 'CONFLICT', message: `Employee ID '${dto.employee_id}' already exists.` } });
    }

    let userId: string | null = null;

    if (dto.login_email) {
      let existingUser = await this.userRepo.findOne({ where: { email: dto.login_email.toLowerCase() } });
      if (!existingUser) {
        const tempPassword = `SchoolOS@${Math.floor(1000 + Math.random() * 9000)}`;
        const passwordHash = await bcrypt.hash(tempPassword, PLATFORM.BCRYPT_ROUNDS);
        const newUser = this.userRepo.create({
          id: uuidv4(),
          email: dto.login_email.toLowerCase(),
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone: dto.phone,
          password_hash: passwordHash,
          is_active: true,
        });
        try {
          existingUser = await this.userRepo.save(newUser);
          console.log(`[HR] Staff login created for ${dto.login_email}. Temp password: ${tempPassword}`);
        } catch {
          throw new ConflictException({ error: { code: 'EMAIL_TAKEN', message: `Email '${dto.login_email}' is already registered.` } });
        }
      }

      const existingMembership = await this.membershipRepo.findOne({
        where: { school_id: user.school_id, user_id: existingUser.id },
      });
      if (!existingMembership) {
        const membership = this.membershipRepo.create({
          school_id: user.school_id,
          user_id: existingUser.id,
          role: (dto.login_role ?? 'teacher') as Parameters<typeof this.membershipRepo.create>[0]['role'],
          is_active: true,
        });
        await this.membershipRepo.save(membership);
      }
      userId = existingUser.id;
    }

    const staff = this.staffRepo.create({
      school_id: user.school_id,
      user_id: userId,
      employee_id: dto.employee_id,
      first_name: dto.first_name,
      last_name: dto.last_name,
      date_of_birth: dto.date_of_birth ?? null,
      gender: (dto.gender as StaffEntity['gender']) ?? null,
      blood_group: dto.blood_group ?? null,
      phone: dto.phone,
      alternate_phone: dto.alternate_phone ?? null,
      personal_email: dto.personal_email ?? null,
      department_id: dto.department_id ?? null,
      designation_id: dto.designation_id ?? null,
      join_date: dto.join_date,
      employment_type: dto.employment_type as StaffEntity['employment_type'],
      status: 'active',
      salary_grade: dto.salary_grade ?? null,
    });

    const saved = await this.staffRepo.save(staff);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'staff',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { employee_id: saved.employee_id, name: `${saved.first_name} ${saved.last_name}` },
    });

    this.eventEmitter.emit('staff.created', { staff_id: saved.id, school_id: user.school_id });

    return saved;
  }

  async findAll(schoolId: string, query: ListStaffQueryDto): Promise<PaginatedStaff> {
    const page = Math.max(1, Number(query.page) || 1);
    const per_page = Math.min(PLATFORM.MAX_PAGE_SIZE, Math.max(1, Number(query.per_page) || PLATFORM.DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * per_page;

    const qb = this.staffRepo.createQueryBuilder('s')
      .where('s.school_id = :schoolId', { schoolId })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('s.last_name', 'ASC')
      .addOrderBy('s.first_name', 'ASC')
      .skip(skip)
      .take(per_page);

    if (query.q) {
      qb.andWhere('(s.first_name ILIKE :q OR s.last_name ILIKE :q OR s.employee_id ILIKE :q)', { q: `%${query.q}%` });
    }
    if (query.filter?.department_id) qb.andWhere('s.department_id = :dept', { dept: query.filter.department_id });
    if (query.filter?.designation_id) qb.andWhere('s.designation_id = :des', { des: query.filter.designation_id });
    if (query.filter?.status) qb.andWhere('s.status = :status', { status: query.filter.status });
    if (query.filter?.employment_type) qb.andWhere('s.employment_type = :et', { et: query.filter.employment_type });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, per_page };
  }

  async findOne(id: string, schoolId: string): Promise<StaffEntity & { department?: DepartmentEntity | null; designation?: DesignationEntity | null }> {
    const staff = await this.staffRepo.findOne({ where: { id, school_id: schoolId } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });

    const [department, designation] = await Promise.all([
      staff.department_id ? this.deptRepo.findOne({ where: { id: staff.department_id } }) : null,
      staff.designation_id ? this.desRepo.findOne({ where: { id: staff.designation_id } }) : null,
    ]);

    return { ...staff, department, designation };
  }

  async update(id: string, dto: UpdateStaffDto, user: AuthUser): Promise<StaffEntity> {
    const staff = await this.staffRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });
    const old = { ...staff };
    Object.assign(staff, dto as object);
    const saved = await this.staffRepo.save(staff);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'staff', resource_id: id, actor_id: user.id, old_value: old as Record<string, unknown>, new_value: dto as Record<string, unknown> });
    this.eventEmitter.emit('staff.updated', { staff_id: id, school_id: user.school_id });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const staff = await this.staffRepo.findOne({ where: { id, school_id: user.school_id } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });
    staff.status = 'inactive';
    staff.deleted_at = new Date();
    await this.staffRepo.save(staff);

    if (staff.user_id) {
      await this.membershipRepo.update(
        { school_id: user.school_id, user_id: staff.user_id },
        { is_active: false },
      );
    }

    await this.auditService.log({ school_id: user.school_id, action: 'DELETE', resource_type: 'staff', resource_id: id, actor_id: user.id });
    this.eventEmitter.emit('staff.deactivated', { staff_id: id, school_id: user.school_id });
  }
}
