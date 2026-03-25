import { PERMISSIONS } from '@schoolos/config';

export const GUARDIANS_PERMISSIONS = {
  manage: PERMISSIONS.STUDENTS_GUARDIAN_MANAGE,
  read: PERMISSIONS.STUDENTS_PROFILE_READ,
} as const;
