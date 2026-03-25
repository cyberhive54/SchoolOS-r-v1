/**
 * Domain event names — all modules emit these events via EventEmitter2.
 * The notification engine subscribes to these events to send notifications.
 * Modules must NOT call notification/SMS/email services directly.
 */

export const EVENT_NAMES = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH_LOGIN_SUCCESS: 'auth.login_success',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_OTP_SENT: 'auth.otp_sent',
  AUTH_SESSION_REVOKED: 'auth.session_revoked',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',

  // ── Students ──────────────────────────────────────────────────────────────
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  STUDENT_PROMOTED: 'student.promoted',

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE_MARKED: 'attendance.marked',
  ATTENDANCE_ABSENT_ALERT: 'attendance.absent_alert',

  // ── Examinations ──────────────────────────────────────────────────────────
  EXAM_SCHEDULED: 'exam.scheduled',
  EXAM_RESULT_PUBLISHED: 'exam.result_published',
  REPORT_CARD_GENERATED: 'exam.report_card_generated',

  // ── Fees ──────────────────────────────────────────────────────────────────
  FEE_INVOICE_CREATED: 'fees.invoice_created',
  FEE_PAYMENT_RECEIVED: 'fees.payment_received',
  FEE_PAYMENT_OVERDUE: 'fees.payment_overdue',
  FEE_RECEIPT_READY: 'fees.receipt_ready',

  // ── Admissions ────────────────────────────────────────────────────────────
  ADMISSION_ENQUIRY_CREATED: 'admissions.enquiry_created',
  ADMISSION_APPLICATION_SUBMITTED: 'admissions.application_submitted',
  ADMISSION_APPLICATION_APPROVED: 'admissions.application_approved',
  ADMISSION_APPLICATION_REJECTED: 'admissions.application_rejected',

  // ── HR ────────────────────────────────────────────────────────────────────
  HR_STAFF_CREATED: 'hr.staff_created',
  HR_LEAVE_APPROVED: 'hr.leave_approved',
  HR_LEAVE_REJECTED: 'hr.leave_rejected',
  HR_PAYROLL_PROCESSED: 'hr.payroll_processed',

  // ── Communication ─────────────────────────────────────────────────────────
  NOTICE_POSTED: 'communication.notice_posted',
  MESSAGE_SENT: 'communication.message_sent',

  // ── System ────────────────────────────────────────────────────────────────
  REPORT_READY: 'report.ready',
  BULK_IMPORT_COMPLETE: 'system.bulk_import_complete',
  MODULE_ACTIVATED: 'platform.module_activated',
  MODULE_DEACTIVATED: 'platform.module_deactivated',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
