import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfileEntity } from '../../entities/staff-profile.entity';
import { StaffEntity } from '../../entities/staff.entity';
import { AuditService } from '../../../../modules/platform/audit/audit.service';
import type { AuthUser } from '@schoolos/types';

export interface UpsertProfileDto {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  aadhaar_no?: string | null;
  pan_no?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
}

@Injectable()
export class StaffProfileService {
  constructor(
    @InjectRepository(StaffProfileEntity)
    private readonly profileRepo: Repository<StaffProfileEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(staffId: string, schoolId: string): Promise<StaffProfileEntity | null> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId, school_id: schoolId } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });
    return this.profileRepo.findOne({ where: { staff_id: staffId, school_id: schoolId } });
  }

  async upsertProfile(staffId: string, dto: UpsertProfileDto, user: AuthUser): Promise<StaffProfileEntity> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId, school_id: user.school_id } });
    if (!staff) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Staff not found.' } });

    let profile = await this.profileRepo.findOne({ where: { staff_id: staffId, school_id: user.school_id } });
    if (profile) {
      Object.assign(profile, dto as object);
    } else {
      profile = this.profileRepo.create({ staff_id: staffId, school_id: user.school_id, ...dto as object });
    }
    const saved = await this.profileRepo.save(profile);
    await this.auditService.log({ school_id: user.school_id, action: 'UPDATE', resource_type: 'staff_profile', resource_id: staffId, actor_id: user.id, new_value: dto as Record<string, unknown> });
    return saved;
  }
}
