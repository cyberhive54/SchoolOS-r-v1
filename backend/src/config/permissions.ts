/**
 * All permission codes in the platform.
 * Format: {module}.{resource}.{action}
 *
 * Every API endpoint declares which permission(s) are required.
 * The PermissionsGuard checks these against role_permissions table.
 */

export const PERMISSIONS = {
  // ── Platform ──────────────────────────────────────────────────────────────
  PLATFORM_SETTINGS_READ: 'platform.settings.read',
  PLATFORM_SETTINGS_WRITE: 'platform.settings.write',
  PLATFORM_SCHOOLS_MANAGE: 'platform.schools.manage',

  // ── Schools (tenant config) ───────────────────────────────────────────────
  SCHOOL_SETTINGS_READ: 'school.settings.read',
  SCHOOL_SETTINGS_WRITE: 'school.settings.write',
  SCHOOL_MODULES_MANAGE: 'school.modules.manage',
  SCHOOL_THEME_READ: 'school.theme.read',
  SCHOOL_THEME_WRITE: 'school.theme.write',

  // ── Students ──────────────────────────────────────────────────────────────
  STUDENTS_PROFILE_READ: 'students.profile.read',
  STUDENTS_PROFILE_CREATE: 'students.profile.create',
  STUDENTS_PROFILE_UPDATE: 'students.profile.update',
  STUDENTS_PROFILE_DELETE: 'students.profile.delete',
  STUDENTS_BULK_IMPORT: 'students.profile.bulk_import',
  STUDENTS_PROMOTE: 'students.profile.promote',
  STUDENTS_SETTINGS_MANAGE: 'students.settings.manage',
  STUDENTS_GUARDIAN_MANAGE: 'students.guardian.manage',
  STUDENTS_ENROLLMENT_MANAGE: 'students.enrollment.manage',

  // ── Academics ─────────────────────────────────────────────────────────────
  ACADEMICS_CLASS_READ: 'academics.class.read',
  ACADEMICS_CLASS_CREATE: 'academics.class.create',
  ACADEMICS_CLASS_UPDATE: 'academics.class.update',
  ACADEMICS_CLASS_DELETE: 'academics.class.delete',
  ACADEMICS_SUBJECT_READ: 'academics.subject.read',
  ACADEMICS_SUBJECT_WRITE: 'academics.subject.write',
  ACADEMICS_TIMETABLE_READ: 'academics.timetable.read',
  ACADEMICS_TIMETABLE_WRITE: 'academics.timetable.write',
  // Phase 2 — Academics module
  ACADEMICS_CLASS_MANAGE: 'academics.class.manage',
  ACADEMICS_SUBJECT_MANAGE: 'academics.subject.manage',
  ACADEMICS_YEAR_MANAGE: 'academics.year.manage',
  ACADEMICS_SECTION_MANAGE: 'academics.section.manage',
  ACADEMICS_CLASS_SECTION_MANAGE: 'academics.class_section.manage',
  ACADEMICS_SUBJECT_GROUP_MANAGE: 'academics.subject_group.manage',
  ACADEMICS_TEACHER_ASSIGNMENT_MANAGE: 'academics.teacher_assignment.manage',
  ACADEMICS_PROMOTION_MANAGE: 'academics.promotion.manage',

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE_MARK: 'attendance.attendance.mark',
  ATTENDANCE_READ: 'attendance.attendance.read',
  ATTENDANCE_REPORT: 'attendance.attendance.report',
  ATTENDANCE_LEAVE_READ: 'attendance.leave.read',
  ATTENDANCE_LEAVE_APPROVE: 'attendance.leave.approve',

  // ── Examinations ──────────────────────────────────────────────────────────
  EXAMINATIONS_READ: 'examinations.exam.read',
  EXAMINATIONS_CREATE: 'examinations.exam.create',
  EXAMINATIONS_MARKS_ENTRY: 'examinations.marks.entry',
  EXAMINATIONS_REPORT_CARD: 'examinations.report_card.generate',

  // ── Fees ──────────────────────────────────────────────────────────────────
  FEES_STRUCTURE_READ: 'fees.structure.read',
  FEES_STRUCTURE_WRITE: 'fees.structure.write',
  FEES_INVOICE_READ: 'fees.invoice.read',
  FEES_INVOICE_CREATE: 'fees.invoice.create',
  FEES_PAYMENT_RECORD: 'fees.payment.record',
  FEES_DISCOUNT_APPLY: 'fees.discount.apply',
  FEES_REPORT: 'fees.report.view',

  // ── Human Resources ───────────────────────────────────────────────────────
  HR_SETTINGS_MANAGE: 'hr.settings.manage',
  HR_STAFF_VIEW: 'hr.staff.view',
  HR_STAFF_CREATE: 'hr.staff.create',
  HR_STAFF_UPDATE: 'hr.staff.update',
  HR_STAFF_DELETE: 'hr.staff.delete',
  HR_LEAVE_MANAGE_TYPES: 'hr.leave.manage_types',
  HR_LEAVE_MANAGE_ALLOCATIONS: 'hr.leave.manage_allocations',
  HR_LEAVE_VIEW: 'hr.leave.view',
  HR_LEAVE_VIEW_ALL: 'hr.leave.view_all',
  HR_LEAVE_REQUEST: 'hr.leave.request',
  HR_LEAVE_APPROVE: 'hr.leave.approve',
  HR_ATTENDANCE_MARK: 'hr.attendance.mark',
  HR_ATTENDANCE_VIEW: 'hr.attendance.view',
  // legacy aliases kept for accountant role
  HR_STAFF_READ: 'hr.staff.read',
  HR_PAYROLL_READ: 'hr.payroll.read',
  HR_PAYROLL_PROCESS: 'hr.payroll.process',
  HR_LEAVE_READ: 'hr.leave.read',

  // ── Communication ─────────────────────────────────────────────────────────
  COMMUNICATION_SEND: 'communication.message.send',
  COMMUNICATION_READ: 'communication.message.read',
  COMMUNICATION_NOTICE_POST: 'communication.notice.post',

  // ── Admissions ────────────────────────────────────────────────────────────
  ADMISSIONS_ENQUIRY_READ: 'admissions.enquiry.read',
  ADMISSIONS_ENQUIRY_CREATE: 'admissions.enquiry.create',
  ADMISSIONS_APPLICATION_READ: 'admissions.application.read',
  ADMISSIONS_APPLICATION_APPROVE: 'admissions.application.approve',

  // ── Reports & Analytics ───────────────────────────────────────────────────
  REPORTS_VIEW: 'reports.report.view',
  REPORTS_EXPORT: 'reports.report.export',

  // ── Audit Logs ────────────────────────────────────────────────────────────
  AUDIT_LOGS_READ: 'platform.audit_logs.read',

  // ── Users & Roles ─────────────────────────────────────────────────────────
  USERS_READ: 'platform.users.read',
  USERS_MANAGE: 'platform.users.manage',
  ROLES_MANAGE: 'platform.roles.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default permission sets per role.
 * Used to seed the role_permissions table.
 * super_admin gets ALL permissions implicitly — no seeding needed, it's checked at the guard level.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.SCHOOL_SETTINGS_WRITE,
    PERMISSIONS.SCHOOL_MODULES_MANAGE,
    PERMISSIONS.SCHOOL_THEME_READ,
    PERMISSIONS.SCHOOL_THEME_WRITE,
    PERMISSIONS.STUDENTS_PROFILE_READ,
    PERMISSIONS.STUDENTS_PROFILE_CREATE,
    PERMISSIONS.STUDENTS_PROFILE_UPDATE,
    PERMISSIONS.STUDENTS_PROFILE_DELETE,
    PERMISSIONS.STUDENTS_BULK_IMPORT,
    PERMISSIONS.STUDENTS_PROMOTE,
    PERMISSIONS.STUDENTS_SETTINGS_MANAGE,
    PERMISSIONS.STUDENTS_GUARDIAN_MANAGE,
    PERMISSIONS.STUDENTS_ENROLLMENT_MANAGE,
    PERMISSIONS.ACADEMICS_CLASS_READ,
    PERMISSIONS.ACADEMICS_CLASS_CREATE,
    PERMISSIONS.ACADEMICS_CLASS_UPDATE,
    PERMISSIONS.ACADEMICS_CLASS_DELETE,
    PERMISSIONS.ACADEMICS_CLASS_MANAGE,
    PERMISSIONS.ACADEMICS_SUBJECT_READ,
    PERMISSIONS.ACADEMICS_SUBJECT_WRITE,
    PERMISSIONS.ACADEMICS_SUBJECT_MANAGE,
    PERMISSIONS.ACADEMICS_TIMETABLE_READ,
    PERMISSIONS.ACADEMICS_TIMETABLE_WRITE,
    PERMISSIONS.ACADEMICS_YEAR_MANAGE,
    PERMISSIONS.ACADEMICS_SECTION_MANAGE,
    PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE,
    PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE,
    PERMISSIONS.ACADEMICS_TEACHER_ASSIGNMENT_MANAGE,
    PERMISSIONS.ACADEMICS_PROMOTION_MANAGE,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_REPORT,
    PERMISSIONS.ATTENDANCE_LEAVE_READ,
    PERMISSIONS.ATTENDANCE_LEAVE_APPROVE,
    PERMISSIONS.EXAMINATIONS_READ,
    PERMISSIONS.EXAMINATIONS_CREATE,
    PERMISSIONS.EXAMINATIONS_MARKS_ENTRY,
    PERMISSIONS.EXAMINATIONS_REPORT_CARD,
    PERMISSIONS.FEES_STRUCTURE_READ,
    PERMISSIONS.FEES_STRUCTURE_WRITE,
    PERMISSIONS.FEES_INVOICE_READ,
    PERMISSIONS.FEES_INVOICE_CREATE,
    PERMISSIONS.FEES_PAYMENT_RECORD,
    PERMISSIONS.FEES_DISCOUNT_APPLY,
    PERMISSIONS.FEES_REPORT,
    PERMISSIONS.HR_SETTINGS_MANAGE,
    PERMISSIONS.HR_STAFF_VIEW,
    PERMISSIONS.HR_STAFF_CREATE,
    PERMISSIONS.HR_STAFF_UPDATE,
    PERMISSIONS.HR_STAFF_DELETE,
    PERMISSIONS.HR_LEAVE_MANAGE_TYPES,
    PERMISSIONS.HR_LEAVE_MANAGE_ALLOCATIONS,
    PERMISSIONS.HR_LEAVE_VIEW,
    PERMISSIONS.HR_LEAVE_VIEW_ALL,
    PERMISSIONS.HR_LEAVE_REQUEST,
    PERMISSIONS.HR_LEAVE_APPROVE,
    PERMISSIONS.HR_ATTENDANCE_MARK,
    PERMISSIONS.HR_ATTENDANCE_VIEW,
    PERMISSIONS.HR_PAYROLL_READ,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_READ,
    PERMISSIONS.COMMUNICATION_NOTICE_POST,
    PERMISSIONS.ADMISSIONS_ENQUIRY_READ,
    PERMISSIONS.ADMISSIONS_ENQUIRY_CREATE,
    PERMISSIONS.ADMISSIONS_APPLICATION_READ,
    PERMISSIONS.ADMISSIONS_APPLICATION_APPROVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
  ],
  teacher: [
    PERMISSIONS.STUDENTS_PROFILE_READ,
    PERMISSIONS.ACADEMICS_CLASS_READ,
    PERMISSIONS.ACADEMICS_SUBJECT_READ,
    PERMISSIONS.ACADEMICS_TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_LEAVE_READ,
    PERMISSIONS.EXAMINATIONS_READ,
    PERMISSIONS.EXAMINATIONS_MARKS_ENTRY,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.HR_LEAVE_VIEW,
    PERMISSIONS.HR_LEAVE_REQUEST,
    PERMISSIONS.HR_ATTENDANCE_VIEW,
  ],
  accountant: [
    PERMISSIONS.STUDENTS_PROFILE_READ,
    PERMISSIONS.FEES_STRUCTURE_READ,
    PERMISSIONS.FEES_STRUCTURE_WRITE,
    PERMISSIONS.FEES_INVOICE_READ,
    PERMISSIONS.FEES_INVOICE_CREATE,
    PERMISSIONS.FEES_PAYMENT_RECORD,
    PERMISSIONS.FEES_DISCOUNT_APPLY,
    PERMISSIONS.FEES_REPORT,
    PERMISSIONS.HR_PAYROLL_READ,
    PERMISSIONS.HR_PAYROLL_PROCESS,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  receptionist: [
    PERMISSIONS.STUDENTS_PROFILE_READ,
    PERMISSIONS.ADMISSIONS_ENQUIRY_READ,
    PERMISSIONS.ADMISSIONS_ENQUIRY_CREATE,
    PERMISSIONS.ADMISSIONS_APPLICATION_READ,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_READ,
  ],
  student: [
    PERMISSIONS.ACADEMICS_CLASS_READ,
    PERMISSIONS.ACADEMICS_SUBJECT_READ,
    PERMISSIONS.ACADEMICS_TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.EXAMINATIONS_READ,
    PERMISSIONS.COMMUNICATION_READ,
  ],
  parent: [
    PERMISSIONS.STUDENTS_PROFILE_READ,
    PERMISSIONS.ACADEMICS_TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.EXAMINATIONS_READ,
    PERMISSIONS.FEES_INVOICE_READ,
    PERMISSIONS.COMMUNICATION_READ,
  ],
};
