import { PERMISSIONS } from '@schoolos/config';

export const TIMETABLE_SLOT_PERMISSIONS = {
  read:  [PERMISSIONS.ACADEMICS_TIMETABLE_READ],
  write: [PERMISSIONS.ACADEMICS_TIMETABLE_WRITE],
} as const;
