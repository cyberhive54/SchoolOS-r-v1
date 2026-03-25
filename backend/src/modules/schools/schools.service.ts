import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolEntity } from './entities/school.entity';
import type { SchoolThemeResponse } from '@schoolos/types';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(SchoolEntity)
    private readonly schoolRepo: Repository<SchoolEntity>,
  ) {}

  /** Find school by UUID — returns null if not found (used by TenantMiddleware) */
  async findById(id: string): Promise<SchoolEntity | null> {
    return this.schoolRepo.findOne({ where: { id, is_active: true } });
  }

  /** Find school by subdomain slug — returns null if not found */
  async findBySlug(slug: string): Promise<SchoolEntity | null> {
    return this.schoolRepo.findOne({ where: { slug, is_active: true } });
  }

  /** Find school by custom domain — returns null if not found */
  async findByDomain(domain: string): Promise<SchoolEntity | null> {
    if (!domain) return null;
    return this.schoolRepo.findOne({ where: { domain, is_active: true } });
  }

  /** Throws if not found — use this in authenticated endpoints where school must exist */
  async findByIdOrFail(id: string): Promise<SchoolEntity> {
    const school = await this.findById(id);
    if (!school) {
      throw new Error(`School not found: ${id}`);
    }
    return school;
  }

  async getTheme(schoolId: string): Promise<SchoolThemeResponse> {
    const school = await this.findByIdOrFail(schoolId);
    return {
      school_id: school.id,
      school_name: school.name,
      theme: school.theme,
    };
  }
}
