export * from './roles';
export * from './permissions';
export * from './events';

export const PLATFORM = {
  ACCESS_TOKEN_EXPIRY_SECONDS: 900,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  OTP_EXPIRY_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 5,
  OTP_LOCKOUT_MINUTES: 15,
  OTP_RATE_LIMIT_PER_10MIN: 3,
  MAX_DEVICE_SESSIONS: 3,
  BCRYPT_ROUNDS: 12,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  AUDIT_LOG_HOT_RETENTION_DAYS: 90,
} as const;

export const MODULE_KEYS = {
  ADMISSIONS: 'admissions',
  STUDENTS: 'students',
  ACADEMICS: 'academics',
  ATTENDANCE: 'attendance',
  EXAMINATIONS: 'examinations',
  ONLINE_EXAMINATIONS: 'online_examinations',
  FEES: 'fees',
  FINANCIAL_ACCOUNTING: 'financial_accounting',
  HR: 'hr',
  COMMUNICATION: 'communication',
  HOMEWORK: 'homework',
  LESSON_PLANNING: 'lesson_planning',
  LMS: 'lms',
  LIVE_CLASSES: 'live_classes',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel',
  LIBRARY: 'library',
  BEHAVIOUR: 'behaviour',
  CERTIFICATES: 'certificates',
  FRONT_OFFICE: 'front_office',
  ALUMNI: 'alumni',
  CMS: 'cms',
  REPORTS: 'reports',
  INVENTORY: 'inventory',
} as const;
