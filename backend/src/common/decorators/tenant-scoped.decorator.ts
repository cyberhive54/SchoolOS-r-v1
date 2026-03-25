import { Column, Index } from 'typeorm';
import { applyDecorators } from '@nestjs/common';

/**
 * @TenantScoped()
 *
 * TypeORM property decorator — marks a column as the tenant school identifier.
 * Apply it on the `school_id` property of any tenant-scoped entity.
 *
 * Combines:
 *   - @Column({ type: 'uuid', nullable: false }) — non-nullable UUID column
 *   - @Index() — individual index (supplements composite indexes)
 *
 * Architecture rules enforced by this decorator:
 *   - `school_id` is always non-nullable on tenant entities
 *   - All composite indexes MUST place `school_id` FIRST (enforced by convention;
 *     composite index definitions live in the entity's @Index() class decorator)
 *
 * Usage:
 *   @Entity('students')
 *   @Index(['school_id', 'id'])               // ← school_id FIRST in composite
 *   export class StudentEntity {
 *     @TenantScoped()
 *     school_id!: string;
 *     ...
 *   }
 */
export function TenantScoped(): PropertyDecorator {
  return applyDecorators(
    Column({
      type: 'uuid',
      nullable: false,
      comment: 'Tenant school UUID — always first in composite indexes',
    }),
    Index(),
  );
}
