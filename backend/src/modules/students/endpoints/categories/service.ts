import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentCategoryEntity } from '../../entities/student-category.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(StudentCategoryEntity)
    private readonly repo: Repository<StudentCategoryEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCategoryDto, user: AuthUser): Promise<StudentCategoryEntity> {
    const existing = await this.repo.findOne({
      where: { school_id: user.school_id, code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: `Category with code '${dto.code}' already exists.` },
      });
    }
    const entity = this.repo.create({ ...dto, school_id: user.school_id });
    const saved = await this.repo.save(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'student_category',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { name: saved.name, code: saved.code },
    });
    return saved;
  }

  async findAll(schoolId: string): Promise<StudentCategoryEntity[]> {
    return this.repo.find({
      where: { school_id: schoolId },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, user: AuthUser): Promise<StudentCategoryEntity> {
    const entity = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!entity) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Category not found.' } });
    }
    if (dto.code && dto.code !== entity.code) {
      const conflict = await this.repo.findOne({ where: { school_id: user.school_id, code: dto.code } });
      if (conflict) {
        throw new ConflictException({
          error: { code: 'CONFLICT', message: `Category with code '${dto.code}' already exists.` },
        });
      }
    }
    Object.assign(entity, dto as object);
    const saved = await this.repo.save(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'student_category',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: dto as Record<string, unknown>,
    });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!entity) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Category not found.' } });
    }
    await this.repo.remove(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'student_category',
      resource_id: id,
      actor_id: user.id,
    });
  }
}
