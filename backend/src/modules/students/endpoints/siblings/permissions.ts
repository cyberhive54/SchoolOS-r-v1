import { PERMISSIONS } from '@schoolos/config';

export const SIBLING_PERMISSIONS = {
  read:   [PERMISSIONS.STUDENTS_PROFILE_READ],
  manage: [PERMISSIONS.STUDENTS_PROFILE_UPDATE],
} as const;
