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

export const PLATFORM = {
  ACCESS_TOKEN_EXPIRY_SECONDS: 900,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  OTP_EXPIRY_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 5,
  OTP_LOCKOUT_MINUTES: 15,
  OTP_RATE_LIMIT_PER_10MIN: 3,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

export const MODULE_KEYS = {
  ADMISSIONS: 'admissions',
  STUDENTS: 'students',
  ACADEMICS: 'academics',
  ATTENDANCE: 'attendance',
  EXAMINATIONS: 'examinations',
  FEES: 'fees',
  HR: 'hr',
  COMMUNICATION: 'communication',
  HOMEWORK: 'homework',
  LMS: 'lms',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel',
  LIBRARY: 'library',
} as const;
