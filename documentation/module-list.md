# SchoolOS — Modules List

This document defines the **complete module structure of the SchoolOS platform**.

It converts the legacy Smart School sidebar structure into **clean domain modules** suitable for a modern SaaS architecture.

Each module describes:

• purpose  
• core responsibilities  
• major features  
• expected outcomes  
• dependencies with other modules  

This document is the **high-level product architecture**.  
Detailed specifications will be defined later in:

- modules-features.md
- database.md
- api.md
- workflows.md
- permissions.md
- events.md
- enums.md

---

# 1 — Front Office Management

## Purpose
Manage all **physical school office interactions** such as visitors, enquiries, complaints, and communication records.

## Responsibilities

Handles day-to-day front desk operations and visitor interactions.

## Core Features

- Admission enquiries
- Visitor registration
- Phone call log
- Postal dispatch
- Postal receive
- Complaint management
- Front office setup

## What This Module Achieves

- Maintains records of public interactions
- Helps reception staff manage visitors and enquiries
- Improves traceability of complaints and office communication

## Dependencies

- Admissions
- Students
- Communication

---

# 2 — Admissions Management

## Purpose

Manage the **student admission lifecycle** from enquiry to enrollment.

## Responsibilities

Handles admission forms, applications, approvals, and admission records.

## Core Features

- Student admission
- Online admission applications
- Admission form management
- Admission approval workflow
- Student category assignment
- Disabled student tracking
- Admission configuration
- Enquiry pipeline (CRM-style: New → Follow-up → Applied → Approved → Enrolled)
- Walk-in and online enquiry capture
- Admission test scheduling
- Document upload and verification
- RTE 25% quota tracking and management
- Lead source tracking (how the enquiry came in)
- Sibling discount / referral tracking at admission stage
- Admission fee collection (linked to Fees module)
- Admission funnel analytics and conversion reports
- Seat availability management per class-section

## What This Module Achieves

- Structured student onboarding
- Digital admission workflow
- Reduced manual paperwork

## Dependencies

- Students
- Academics
- Fees
- Communication

---

# 3 — Student Information Management

## Purpose

Maintain **complete student records** across the school system.

## Responsibilities

Acts as the **central identity system for students**.

## Core Features

- Student profile management
- Guardian linking
- Student house management
- Multi-class student support
- Student category management
- Student status control
- Bulk student operations

## What This Module Achieves

- Single source of truth for student data
- Centralized student identity management
- Cross-module student integration

## Dependencies

- Academics
- Attendance
- Fees
- Examinations
- Transport
- Hostel

---

# 4 — Academic Structure Management

## Purpose

Define the **academic structure of the school**.

## Responsibilities

Manages classes, sections, subjects, and academic assignments.

## Core Features

- Class management
- Section management
- Subject management
- Subject groups
- Class teacher assignment
- Subject teacher assignment per class-section
- Student promotion (bulk year-end promotion with detention / transfer support)
- Class timetable (period-by-period scheduling)
- Teacher timetable (what each teacher teaches, when)
- Timetable conflict detection (no double-booking of teacher or room)
- Substitution management (cover for absent teachers)
- Free period tracking
- Timetable publish to parent portal and app

## What This Module Achieves

- Defines the academic hierarchy
- Supports scheduling and course structure
- Enables promotion workflows

## Dependencies

- Students
- Attendance
- Examinations
- Lesson Planning

---

# 5 — Attendance Management

## Purpose

Track and manage **student attendance records**.

## Responsibilities

Maintains attendance logs, leave approvals, and attendance reporting.

## Core Features

- Daily attendance entry (class-wise)
- Period-wise attendance (secondary schools)
- Attendance by date
- Leave requests
- Leave approval
- QR attendance integration
- Biometric / RFID integration (hardware devices)
- Facial recognition attendance (future)
- Parent SMS / WhatsApp alert on absence
- Low attendance threshold alerts
- Monthly and annual attendance summary reports
- Attendance reporting

## What This Module Achieves

- Accurate student attendance tracking
- Automated absence monitoring
- Improved academic accountability

## Dependencies

- Students
- Academics
- Reports

---

# 6 — Examination Management

## Purpose

Manage **school examination processes** and grading.

## Responsibilities

Handles exam scheduling, marks entry, report cards, and academic evaluation.

## Core Features

- Exam groups and exam types (Unit Test, Half-yearly, Annual, Board)
- Exam scheduling
- Admit card / hall ticket generation
- Marks entry (subject-wise, per exam)
- Marks grading (GPA, letter grade, percentage)
- CBSE CCE / CWA grading format support
- ICSE report card format support
- NEP 2020 Holistic Progress Card generation
- Co-scholastic and activities grading
- Competency-based assessment support
- Tabulation register generation
- Marksheet generation
- Rank and merit list generation
- Result publishing to parent portal
- Exam reports and academic performance analytics

## What This Module Achieves

- Structured academic evaluation
- Digital report cards
- Standardized grading processes

## Dependencies

- Students
- Academics
- Reports

---

# 7 — Online Examination System

## Purpose

Conduct **digital exams and assessments**.

## Responsibilities

Manages online exams, question banks, and student attempts.

## Core Features

- Online exam creation
- Question bank
- Exam attempts
- Auto grading
- Exam analytics

## What This Module Achieves

- Digital assessment capability
- Remote examinations
- Automated grading

## Dependencies

- Students
- Academics
- Reports

---

# 8 — Fees & Billing Management

## Purpose

Manage **student fee structures and payments**.

## Responsibilities

Handles invoices, fee collection, discounts, and reminders.

## Core Features

- Fee structure management (line items, billing cycles)
- Fee groups and fee types
- Installment and due date management
- Late fee automation (per day, after grace period)
- Individual student fee override (different from class-level structure)
- Bulk invoice generation (class-wise, year-wise)
- Fee collection
- Offline payments (cash, cheque, bank transfer, UPI — manual recording)
- Online payment collection (Razorpay, PayU, UPI payment gateway)
- Payment link generation (shareable via WhatsApp/SMS)
- PDF receipt generation
- Discounts and concession management
- Scholarship tracking
- RTE fee reimbursement tracking
- Fee carry forward / arrears management
- Fee reminders (SMS, WhatsApp, email)
- Payment tracking and fee collection MIS reports
- Tally export for accounting integration
- Idempotency controls (prevent duplicate payment recording)

## What This Module Achieves

- Transparent financial records
- Automated fee tracking
- Reduced manual accounting

## Dependencies

- Students
- Finance
- Reports
- Communication

---

# 9 — Financial Accounting

## Purpose

Track **school income and expenses**.

## Responsibilities

Manages financial records beyond student fees.

## Core Features

- Income management
- Expense management
- Financial heads
- Financial reports

## What This Module Achieves

- Financial transparency
- Budget tracking
- Expense management

## Dependencies

- Reports

---

# 10 — Human Resource Management

## Purpose

Manage **staff records and HR operations**.

## Responsibilities

Maintains staff data, payroll, and leave management.

## Core Features

- Staff directory with complete profiles
- Staff attendance (daily marking: Present, Absent, Half-Day, On Leave, Holiday)
- Biometric / RFID attendance for staff (hardware integration, future)
- Payroll management (see Module 32 — Payroll Management for full detail)
- Leave requests
- Leave approval workflow
- Department management
- Designation management
- Employment type management (permanent, contract, part-time, probation)
- Staff document management (certificates, offer letters)
- Teacher performance ratings and appraisal (future)

## What This Module Achieves

- Centralized staff management
- Payroll automation
- Leave management system

## Dependencies

- Academics
- Attendance

---

# 11 — Communication System

## Purpose

Provide **multi-channel communication** between school and users.

## Responsibilities

Manages email, SMS, notifications, and announcements.

## Core Features

- Notice board (digital announcements)
- Email sending (via SES / SendGrid / Mailgun)
- SMS sending (via MSG91 / Textlocal / bulk SMS providers)
- DLT / TRAI compliance for SMS (sender ID, template registration)
- WhatsApp Business API integration (Meta / Twilio / Gupshup)
- FCM push notifications (Android and iOS)
- Message templates with dynamic variables ({{student_name}}, {{amount}})
- Opt-in / opt-out management (TRAI and WhatsApp policy compliance)
- Scheduled messages and bulk broadcast
- Communication logs and delivery tracking
- Parent-teacher direct messaging
- Circular management with PDF attachments
- Channel fallback logic (if Push fails → SMS)

## What This Module Achieves

- Efficient school communication
- Parent notifications
- Automated messaging

## Dependencies

- Notification Engine
- Students
- HR

---

# 12 — Homework & Assignment Management

## Purpose

Manage **student assignments and homework tracking**.

## Responsibilities

Allows teachers to assign and track homework.

## Core Features

- Homework creation
- Assignment submission
- Homework tracking
- Assignment reports

## What This Module Achieves

- Digital assignment management
- Improved teacher-student collaboration

## Dependencies

- Students
- Academics

---

# 13 — Lesson Planning

## Purpose

Help teachers **plan lessons and syllabus coverage**.

## Responsibilities

Manages lesson plans and syllabus progress.

## Core Features

- Lesson creation
- Topic management
- Lesson scheduling
- Syllabus progress tracking
- Lesson copying

## What This Module Achieves

- Organized teaching plans
- Syllabus monitoring

## Dependencies

- Academics

---

# 14 — Learning Management System (LMS)

## Purpose

Provide **online course learning capabilities**.

## Responsibilities

Manages courses, learning materials, and assessments.

## Core Features

- Course management
- Course categories
- Question bank
- Certificates
- Course reports

## What This Module Achieves

- Online learning support
- Course certification

## Dependencies

- Students
- Academics

---

# 15 — Library Management

## Purpose

Manage **library books and borrowing**.

## Responsibilities

Tracks books, borrowers, and return status.

## Core Features

- Book catalog (ISBN, author, publisher, category)
- Barcode / RFID integration for book identification
- Issue and return tracking
- Fine management for overdue books
- Book reservation
- Overdue auto-notices to borrowers
- Library membership management (students and staff)
- Library reports

## What This Module Achieves

- Organized library operations
- Book circulation tracking

## Dependencies

- Students
- HR

---

# 16 — Inventory Management

## Purpose

Manage **school inventory and supplies**.

## Responsibilities

Tracks stock, suppliers, and issued items.

## Core Features

- Item catalog
- Stock management
- Supplier management
- Issue item tracking

## What This Module Achieves

- Inventory transparency
- Supply chain tracking

## Dependencies

- Finance

---

# 17 — Transport Management

## Purpose

Manage **school transportation system**.

## Responsibilities

Tracks routes, vehicles, and student transport assignments.

## Core Features

- Routes and stop / pickup point management
- Vehicle management (bus, van, tempo)
- Driver and attendant management
- Student-to-route assignment
- Transport fee auto-assignment (linked to Fees module)
- GPS real-time tracking integration (hardware)
- Parent ETA and location alerts
- Vehicle maintenance logs
- Fuel log management

## What This Module Achieves

- Organized student transportation
- Route planning

## Dependencies

- Students
- Fees

---

# 18 — Hostel Management

## Purpose

Manage **school hostel accommodation**.

## Responsibilities

Tracks hostels, rooms, and student allocations.

## Core Features

- Hostel and dormitory definition (multiple blocks / buildings)
- Room types (AC, Non-AC, dormitory)
- Room allocation and bed / seat assignment
- Student hostel registration
- Hostel fee integration (linked to Fees module)
- Mess management (menu planning and mess billing)
- Warden management and duty roster
- Visitor management and gate entry log

## What This Module Achieves

- Organized hostel operations
- Room occupancy management

## Dependencies

- Students
- Fees

---

# 19 — Certificates & ID Cards

## Purpose

Generate official **student and staff certificates**.

## Responsibilities

Handles ID cards and official documents.

## Core Features

- Student certificates
- Transfer certificates
- Student ID cards
- Staff ID cards
- Certificate templates

## What This Module Achieves

- Automated document generation
- Standardized school certificates

## Dependencies

- Students
- HR

---

# 20 — Digital Content Center

## Purpose

Manage **educational resources and downloads**.

## Responsibilities

Stores and distributes learning content.

## Core Features

- File uploads
- Content sharing
- Video tutorials
- Content categories

## What This Module Achieves

- Digital resource sharing
- Student learning support

## Dependencies

- LMS

---

# 21 — Student Portfolio / CV

## Purpose

Allow students to generate **academic portfolios**.

## Responsibilities

Builds student CVs based on school achievements.

## Core Features

- CV builder
- CV export

## What This Module Achieves

- Student academic portfolio
- Resume preparation

## Dependencies

- Students
- Examinations

---

# 22 — Behaviour Management

## Purpose

Track **student behavioral incidents**.

## Responsibilities

Logs incidents and disciplinary actions.

## Core Features

- Incident tracking
- Incident assignment
- Behaviour reports

## What This Module Achieves

- Student discipline monitoring
- Behavioral reporting

## Dependencies

- Students
- Reports

---

# 23 — Annual Calendar

## Purpose

Manage **school events and holidays**.

## Responsibilities

Maintains academic calendar.

## Core Features

- Event management (school events, functions, sports day)
- Holiday types and working day configuration
- Academic calendar setup (term dates, exam weeks)
- Calendar display (school-wide and class-wise views)
- Parent-facing calendar view (visible in parent portal and app)
- iCal / Google Calendar sync (export school calendar)

## What This Module Achieves

- Organized school scheduling

## Dependencies

- Academics

---

# 24 — Alumni Management

## Purpose

Maintain records of **former students**.

## Responsibilities

Tracks alumni and organizes alumni events.

## Core Features

- Alumni records
- Alumni events

## What This Module Achieves

- Alumni engagement
- Networking opportunities

## Dependencies

- Students

---

# 25 — Live Classes

## Purpose

Enable **virtual classrooms**.

## Responsibilities

Integrates with video conferencing platforms.

## Core Features

- Live classes
- Meeting scheduling
- Class reports
- Integration with Google Meet and Zoom

## What This Module Achieves

- Remote learning support

## Dependencies

- Academics
- LMS

---

# 26 — Content Management System (CMS)

## Purpose

Manage **school website content**.

## Responsibilities

Handles front-facing website pages and media.

## Core Features

- Pages
- Menus
- Gallery
- Events
- News
- Media manager
- Banner images

## What This Module Achieves

- Public website management

## Dependencies

- None

---

# 27 — Reports & Analytics

## Purpose

Provide **comprehensive system reporting**.

## Responsibilities

Aggregates reports across modules.

## Core Features

- Student reports (academic performance, progress over years)
- Finance reports (fee collection MIS, outstanding, arrears, concession summary)
- Attendance reports (class-wise, student-wise, monthly summaries)
- Exam reports (marksheets, rank lists, subject-wise analytics)
- HR reports (staff attendance, leave summary, payroll summaries)
- Admission funnel reports (enquiry to enrollment conversion)
- UDISE data export (annual government compliance report)
- Executive dashboard (principal / management KPI view)
- Audit logs (system-wide, immutable, filterable)
- Custom report builder (future)
- AI-powered predictive analytics (future)

## What This Module Achieves

- Data-driven school management

## Dependencies

- All modules

---

# 28 — Multi-Branch Management

## Purpose

Manage **schools with multiple branches**.

## Responsibilities

Handles branch data and reporting.

## Core Features

- Branch overview
- Branch reports
- Branch configuration

## What This Module Achieves

- Multi-campus administration

## Dependencies

- All modules

---

# 29 — System Administration

## Purpose

Control **global platform settings**.

## Responsibilities

Manages users, permissions, integrations, and configuration.

## Core Features

- Roles and permissions
- User management
- System configuration
- Payment settings
- Notification settings
- Language settings
- Backup and restore
- Module configuration

## What This Module Achieves

- Centralized system control
- Platform customization

## Dependencies

- All modules

---

# 30 — Platform Management

## Purpose

Manage the **SaaS platform layer of SchoolOS**, including tenant schools, subscriptions, billing plans, and platform-level operations.

This module is used by **platform administrators**, not individual schools.

## Responsibilities

Controls how schools are created, managed, billed, and configured across the entire SchoolOS platform.

## Core Features

- School (tenant) management
- Subscription plan management
- Billing plan configuration
- School onboarding
- Tenant configuration
- Platform usage monitoring
- Tenant suspension / activation
- Tenant resource allocation
- Tenant database grouping
- Platform audit logs
- Platform-level analytics

## What This Module Achieves

- Enables SchoolOS to function as a **multi-tenant SaaS platform**
- Allows centralized management of all schools
- Supports subscription-based monetization
- Provides platform-wide visibility and control

## Dependencies

- Multi-Branch Management
- System Administration
- Finance
- Reports & Analytics

---

# 31 — Notification & Messaging Engine

## Purpose

Provide a **centralized notification infrastructure** for the entire platform.

This module handles the delivery of messages across multiple channels such as SMS, Email, Push Notifications, and WhatsApp.

## Responsibilities

Routes system events into communication channels and ensures reliable message delivery.

## Core Features

- SMS notifications
- Email notifications
- Push notifications
- WhatsApp messaging
- Notification templates
- Notification scheduling
- Notification logs
- Channel fallback logic
- Provider integrations
- Event-driven notifications
- Message queue processing
- Delivery tracking

## What This Module Achieves

- Enables automated communication between schools and users
- Ensures reliable notification delivery
- Centralizes messaging infrastructure
- Supports event-driven messaging across modules

## Dependencies

- Communication System
- Events System
- All modules that generate notifications

---

# 32 — Payroll Management

## Purpose

Process **staff salaries with full Indian statutory compliance**.

## Responsibilities

Calculates monthly payroll, deductions, and generates statutory reports.

## Core Features

- Salary structure definition (basic, HRA, DA, allowances, deductions)
- Monthly payroll processing (one-click run)
- PF (Provident Fund) computation and ECR file export
- ESI computation
- Professional Tax / TDS deduction
- Gratuity calculation
- Arrears and advance management
- Pay slip generation (PDF, email to staff)
- Bank transfer export file (NEFT / RTGS format)
- Form 16 generation (annual)
- Payroll reports (monthly, annual, department-wise)

## What This Module Achieves

- Automated statutory-compliant payroll
- Eliminates manual salary calculation errors
- Generates all documents needed for bank transfer and government filings

## Dependencies

- Human Resource Management
- Financial Accounting
- Reports

---

# 33 — Parent Portal & Mobile App

## Purpose

Provide **parents with real-time visibility** into their child's school life.

## Responsibilities

Serves as the primary parent-facing interface across web and mobile.

## Core Features

- Parent web portal (browser-based, no app install required)
- Android mobile app (parent-facing)
- iOS mobile app (parent-facing)
- Teacher mobile app (attendance, marks, homework)
- Fee payment and payment history view
- Fee receipt download
- Student attendance view (daily, monthly)
- Marks and report card view and download
- Timetable view
- Homework and assignment view
- Circular and notice download
- School event calendar
- Push notification preferences management
- Real-time absence and low attendance alerts
- Transport location / ETA view (when GPS module active)
- Direct messaging with teachers (future)

## What This Module Achieves

- Increases parent engagement and satisfaction
- Reduces calls to school office for routine information
- Enables online fee payment — reduces cash handling

## Dependencies

- Students
- Fees
- Attendance
- Examinations
- Communication
- Notification Engine

---

# 34 — Health & Medical Management

## Purpose

Maintain **student and staff health records** within the school system.

## Responsibilities

Tracks medical history, health incidents, and health-related documentation.

## Core Features

- Student health profile (blood group, known allergies, chronic conditions)
- Medical history records
- Vaccination tracking and schedule
- Doctor / nurse visit log
- Illness and injury incident reports
- Health certificates
- Staff health records (basic)
- Emergency medical contact information

## What This Module Achieves

- Centralized health data accessible during emergencies
- Vaccination and health compliance tracking
- Reduced reliance on paper-based health registers

## Dependencies

- Students
- Human Resource Management

---

# 35 — UDISE & Government Compliance

## Purpose

Generate **government-mandated reports and compliance data** for Indian school regulations.

## Responsibilities

Aggregates data from across modules and formats it for government submission.

## Core Features

- UDISE+ data compilation and export (annual)
- Aadhaar seeding status report (students and staff)
- RTE 25% quota utilization report
- Scholarship and DBT (Direct Benefit Transfer) tracking
- Category-wise student count (SC / ST / OBC / EWS / General)
- Minority institution reporting
- Board-affiliation compliance data
- State education department report formats
- Disability and differently-abled student tracking

## What This Module Achieves

- Simplifies the annual UDISE submission process
- Ensures RTE quota compliance is auditable
- Supports government scholarship disbursement tracking

## Dependencies

- Students
- Admissions
- Reports

---

# End of Document