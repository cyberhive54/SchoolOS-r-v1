import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import type { CreateAuditLogDto } from '@schoolos/types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * Record an audit log entry. Never throws — logs the error and continues.
   * Audit logging must never interrupt the main request flow.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        school_id: dto.school_id,
        action: dto.action,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id ?? null,
        actor_id: dto.actor_id ?? null,
        old_value: dto.old_value ?? null,
        new_value: dto.new_value ?? null,
        ip_address: dto.ip_address ?? null,
        user_agent: dto.user_agent ?? null,
        metadata: dto.metadata ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (error) {
      // Audit failure must NEVER propagate — log and continue
      this.logger.error('Failed to write audit log entry', error);
    }
  }
}
