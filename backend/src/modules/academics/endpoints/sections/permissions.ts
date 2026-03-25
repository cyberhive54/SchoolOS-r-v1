import { PERMISSIONS } from '@schoolos/config';
export const SECTION_PERMISSIONS = {
  manage: [PERMISSIONS.ACADEMICS_SECTION_MANAGE],
  read: [PERMISSIONS.ACADEMICS_CLASS_READ],
} as const;
