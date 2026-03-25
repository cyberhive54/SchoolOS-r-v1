import { PERMISSIONS } from '@schoolos/config';

export const HOUSES_PERMISSIONS = {
  manage: PERMISSIONS.STUDENTS_SETTINGS_MANAGE,
  read: PERMISSIONS.STUDENTS_PROFILE_READ,
} as const;
