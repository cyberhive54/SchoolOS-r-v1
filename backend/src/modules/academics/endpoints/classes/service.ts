import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClassEntity } from '../../entities/class.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateClassDto, UpdateClassDto } from './dto/request.dto';
import type { ClassDto } from './dto/response.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateClassDto, user: AuthUser): Promise<ClassDto> {
    const existing = await this.classRepo.findOne({
      where: { school_id: user.school_id, name: dto.name, deleted_at: IsNull() },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: `Class '${dto.name}' already exists.` },
      });
    }

    const nextOrder = dto.order_index ?? (await this.classRepo.count({
      where: { school_id: user.school_id, deleted_at: IsNull() },
    }));

    const cls = this.classRepo.create({
      school_id: user.school_id,
      name: dto.name,
      order_index: nextOrder,
    });
    const saved = await this.classRepo.save(cls);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'class',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { name: saved.name },
    });

    return this.toDto(saved);
  }

  async findAll(schoolId: string): Promise<ClassDto[]> {
    const classes = await this.classRepo.find({
      where: { school_id: schoolId, deleted_at: IsNull() },
      order: { order_index: 'ASC', name: 'ASC' },
    });
    return classes.map((c) => this.toDto(c));
  }

  async findOne(id: string, schoolId: string): Promise<ClassDto> {
    const cls = await this.classRepo.findOne({
      where: { id, school_id: schoolId, deleted_at: IsNull() },
    });
    if (!cls) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
    }
    return this.toDto(cls);
  }

  async update(id: string, dto: UpdateClassDto, user: AuthUser): Promise<ClassDto> {
    const cls = await this.classRepo.findOne({
      where: { id, school_id: user.school_id, deleted_at: IsNull() },
    });
    if (!cls) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
    }

    if (dto.name && dto.name !== cls.name) {
      const conflict = await this.classRepo.findOne({
        where: { school_id: user.school_id, name: dto.name, deleted_at: IsNull() },
      });
      if (conflict) {
        throw new ConflictException({
          error: { code: 'CONFLICT', message: `Class '${dto.name}' already exists.` },
        });
      }
    }

    const old = { name: cls.name, order_index: cls.order_index };
    if (dto.name !== undefined) cls.name = dto.name;
    if (dto.order_index !== undefined) cls.order_index = dto.order_index;

    const saved = await this.classRepo.save(cls);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'class',
      resource_id: id,
      actor_id: user.id,
      old_value: old,
      new_value: { name: saved.name, order_index: saved.order_index },
    });

    return this.toDto(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const cls = await this.classRepo.findOne({
      where: { id, school_id: user.school_id, deleted_at: IsNull() },
    });
    if (!cls) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
    }
    await this.classRepo.softDelete(id);

    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'class',
      resource_id: id,
      actor_id: user.id,
      old_value: { name: cls.name },
    });
  }

  private toDto(c: ClassEntity): ClassDto {
    return {
      id: c.id,
      school_id: c.school_id,
      name: c.name,
      order_index: c.order_index,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString(),
    };
  }
}
