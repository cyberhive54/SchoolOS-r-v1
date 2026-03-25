import { PERMISSIONS } from '@schoolos/config';

export const STAFF_DOCUMENT_PERMISSIONS = {
  read:   [PERMISSIONS.HR_STAFF_VIEW],
  create: [PERMISSIONS.HR_STAFF_UPDATE],
  delete: [PERMISSIONS.HR_STAFF_UPDATE],
} as const;
