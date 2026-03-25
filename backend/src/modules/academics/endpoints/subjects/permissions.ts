import { PERMISSIONS } from '@schoolos/config';
export const SUBJECT_PERMISSIONS = {
  write: [PERMISSIONS.ACADEMICS_SUBJECT_WRITE],
  read: [PERMISSIONS.ACADEMICS_SUBJECT_READ],
} as const;
