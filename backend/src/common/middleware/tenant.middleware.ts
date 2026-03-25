import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { SchoolsService } from '../../modules/schools/schools.service';

/**
 * TenantMiddleware — resolves which school (tenant) this request belongs to.
 *
 * Resolution strategy (in priority order):
 *   1. X-School-ID header (UUID) — recommended for API clients and local dev
 *   2. Subdomain of Host header — e.g. "springfield.schoolos.com" → slug "springfield"
 *   3. Custom domain field — e.g. "erp.springfieldschool.edu" stored in schools.domain
 *
 * Dev / localhost note:
 *   Subdomain/domain resolution is skipped for localhost.
 *   Always send the X-School-ID header in local dev.
 *   Run `pnpm schoolos:seed` to get the school UUID, or set NEXT_PUBLIC_SCHOOL_ID in .env.
 *
 * Sets req.school_id (UUID) and req.school (SchoolEntity) on success.
 * Returns 422 TENANT_NOT_FOUND if no school can be resolved.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly schoolsService: SchoolsService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const rawPath = req.path ?? '';
    const path = rawPath.replace(/\/+$/, '');

    // Skip for health check — no tenant context needed
    if (path === '/healthz' || path.endsWith('/healthz')) {
      return next();
    }

    // Strategy 1: X-School-ID header (UUID)
    const headerSchoolId = req.headers['x-school-id'];
    if (typeof headerSchoolId === 'string' && this.isUuid(headerSchoolId.trim())) {
      const school = await this.schoolsService.findById(headerSchoolId.trim());
      if (school?.is_active) {
        req.school_id = school.id;
        req.school = school;
        return next();
      }
    }

    // Strategy 2: Subdomain of Host header (skipped on localhost)
    const host = (req.headers['host'] ?? '') as string;
    const subdomain = this.extractSubdomain(host);
    if (subdomain) {
      const school = await this.schoolsService.findBySlug(subdomain);
      if (school?.is_active) {
        req.school_id = school.id;
        req.school = school;
        return next();
      }
    }

    // Strategy 3: Full custom domain match (skipped on localhost)
    const bareHost = host.split(':')[0];
    if (bareHost && !this.isLocalhost(bareHost)) {
      const school = await this.schoolsService.findByDomain(bareHost);
      if (school?.is_active) {
        req.school_id = school.id;
        req.school = school;
        return next();
      }
    }

    // No school resolved — 404 with actionable dev guidance
    throw new HttpException(
      {
        error: {
          code: 'SCHOOL_NOT_FOUND',
          message:
            'Could not determine which school this request belongs to. ' +
            'Include the X-School-ID header with a valid school UUID.',
          details: {
            hint: 'Run `pnpm schoolos:seed` to get the school UUID, then set NEXT_PUBLIC_SCHOOL_ID in .env.',
            header_name: 'X-School-ID',
            example: 'X-School-ID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
          },
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }

  private isUuid(v: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  private extractSubdomain(host: string): string | null {
    const bare = host.split(':')[0];
    if (!bare || this.isLocalhost(bare)) return null;
    const parts = bare.split('.');
    if (parts.length < 3) return null;
    const sub = parts[0];
    if (!sub || sub === 'www' || sub === 'api') return null;
    return sub;
  }

  private isLocalhost(host: string): boolean {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }
}
