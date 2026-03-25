import type { UserRole } from '../types';

export const ROLES = {
  SUPER_ADMIN: 'super_admin' as const,
  ADMIN: 'admin' as const,
  TEACHER: 'teacher' as const,
  STUDENT: 'student' as const,
  PARENT: 'parent' as const,
  ACCOUNTANT: 'accountant' as const,
  RECEPTIONIST: 'receptionist' as const,
} satisfies Record<string, UserRole>;

export const ALL_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.TEACHER,
  ROLES.STUDENT,
  ROLES.PARENT,
  ROLES.ACCOUNTANT,
  ROLES.RECEPTIONIST,
];

export const REQUIRES_2FA_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ACCOUNTANT,
];

export const ADMIN_ROLES: UserRole[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
