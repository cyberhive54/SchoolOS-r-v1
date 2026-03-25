import type { AuthUser } from '@schoolos/types';
import type { SchoolEntity } from '../../modules/schools/entities/school.entity';

declare module 'express' {
  interface Request {
    /** Set by TenantMiddleware — UUID of the resolved school */
    school_id?: string;
    /** Set by TenantMiddleware — full school entity */
    school?: SchoolEntity;
    /** Set by JwtAuthGuard — decoded and verified JWT payload */
    user?: AuthUser;
  }
}
