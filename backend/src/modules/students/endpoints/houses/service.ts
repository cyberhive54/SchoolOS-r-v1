import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentHouseEntity } from '../../entities/student-house.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { CreateHouseDto, UpdateHouseDto } from './dto/request.dto';
import type { AuthUser } from '@schoolos/types';

@Injectable()
export class HousesService {
  constructor(
    @InjectRepository(StudentHouseEntity)
    private readonly repo: Repository<StudentHouseEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateHouseDto, user: AuthUser): Promise<StudentHouseEntity> {
    const existing = await this.repo.findOne({
      where: { school_id: user.school_id, name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: `House '${dto.name}' already exists.` },
      });
    }
    const entity = this.repo.create({ ...dto, school_id: user.school_id });
    const saved = await this.repo.save(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'CREATE',
      resource_type: 'student_house',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: { name: saved.name },
    });
    return saved;
  }

  async findAll(schoolId: string): Promise<StudentHouseEntity[]> {
    return this.repo.find({
      where: { school_id: schoolId },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateHouseDto, user: AuthUser): Promise<StudentHouseEntity> {
    const entity = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!entity) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'House not found.' } });
    }
    if (dto.name && dto.name !== entity.name) {
      const conflict = await this.repo.findOne({ where: { school_id: user.school_id, name: dto.name } });
      if (conflict) {
        throw new ConflictException({
          error: { code: 'CONFLICT', message: `House '${dto.name}' already exists.` },
        });
      }
    }
    Object.assign(entity, dto as object);
    const saved = await this.repo.save(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'UPDATE',
      resource_type: 'student_house',
      resource_id: saved.id,
      actor_id: user.id,
      new_value: dto as Record<string, unknown>,
    });
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, school_id: user.school_id } });
    if (!entity) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'House not found.' } });
    }
    await this.repo.remove(entity);
    await this.auditService.log({
      school_id: user.school_id,
      action: 'DELETE',
      resource_type: 'student_house',
      resource_id: id,
      actor_id: user.id,
    });
  }
}
