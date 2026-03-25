```markdown
# SchoolOS — Module Dependency Map

This document defines the **module dependency architecture** of SchoolOS.

The purpose of this map is to:

- prevent circular dependencies
- keep database relationships clean
- ensure scalable module development
- guide AI agents when designing APIs and database schemas

Each module belongs to a **layer**, and modules may only depend on modules in the **same layer or lower layers**.

---

# Architecture Layers

SchoolOS modules are organized into the following layers:

1. Platform Layer
2. Core Domain Layer
3. Academic Operations Layer
4. Student Services Layer
5. Financial Layer
6. Communication Layer
7. Administrative Operations Layer
8. Analytics Layer

Lower layers provide foundational data that higher layers can use.

---

# Layer 1 — Platform Layer

These modules control the **SaaS infrastructure** of SchoolOS.

Modules:

- platform-management
- multi-branch-management
- system-administration

Purpose:

- manage tenants (schools)
- manage platform configuration
- manage system-wide settings
- manage modules and permissions

Dependencies:

Platform modules may access any module configuration but **no operational module should depend directly on platform-management**.

---

# Layer 2 — Core Domain Layer

These modules define the **core identity of the school system**.

Modules:

- students
- academics
- human-resources
- annual-calendar

Purpose:

These modules define the core entities used throughout the platform:

- students
- staff
- classes
- subjects
- academic sessions
- calendar events

Dependencies:

These modules should be **independent of operational modules**.

Other modules rely on these modules as foundational data sources.

---

# Layer 3 — Academic Operations Layer

Modules that operate directly on academic activities.

Modules:

- attendance
- examinations
- online-examinations
- lesson-planning
- homework
- learning-management-system
- live-classes

Dependencies:

- students
- academics
- human-resources

Examples:

attendance → students  
attendance → academics  

examinations → students  
examinations → academics  

---

# Layer 4 — Student Services Layer

Modules that manage services provided to students.

Modules:

- transport
- hostel
- library
- health-medical
- behaviour-management
- student-portfolio
- certificates
- digital-content-center

Dependencies:

- students
- academics
- human-resources

Examples:

transport → students  
hostel → students  
library → students  

---

# Layer 5 — Financial Layer

Modules responsible for financial operations.

Modules:

- fees
- financial-accounting
- payroll
- inventory

Dependencies:

- students
- human-resources

Examples:

fees → students  
inventory → financial-accounting  

---

# Layer 6 — Communication Layer

Modules responsible for messaging and notifications.

Modules:

- communication
- notification-engine
- parent-portal

Dependencies:

- students
- human-resources
- events emitted by operational modules

Examples:

attendance → notification-engine  
fees → notification-engine  

Modules should emit events rather than calling communication services directly.

---

# Layer 7 — Administrative Operations Layer

Modules that support administrative functions.

Modules:

- front-office
- admissions
- alumni
- content-management-system

Dependencies:

- students
- communication

Examples:

admissions → students  
front-office → admissions  

---

# Layer 8 — Analytics Layer

Analytics and reporting modules.

Modules:

- reports-analytics
- udise-compliance

Dependencies:

All modules.

Important rule:

Analytics modules **must not modify data**.  
They are strictly read-only.

---

# Complete Module Dependency Structure

Platform Layer
│
├── platform-management
├── multi-branch-management
└── system-administration

Core Domain Layer
│
├── students
├── academics
├── human-resources
└── annual-calendar

Academic Operations Layer
│
├── attendance
├── examinations
├── online-examinations
├── lesson-planning
├── homework
├── learning-management-system
└── live-classes

Student Services Layer
│
├── transport
├── hostel
├── library
├── health-medical
├── behaviour-management
├── student-portfolio
├── certificates
└── digital-content-center

Financial Layer
│
├── fees
├── financial-accounting
├── payroll
└── inventory

Communication Layer
│
├── communication
├── notification-engine
└── parent-portal

Administrative Operations Layer
│
├── front-office
├── admissions
├── alumni
└── content-management-system

Analytics Layer
│
├── reports-analytics
└── udise-compliance

---

# Hard Dependency Rules

These rules must always be followed when designing APIs, database relations, or services.

---

## Rule 1 — Lower Layers Cannot Depend on Higher Layers

Modules in lower layers must not depend on modules in higher layers.

Example:

students must not depend on fees.

Correct:

fees → students

Incorrect:

students → fees

---

## Rule 2 — Prefer Core Domain Dependencies

Operational modules should depend on **core domain modules** rather than other operational modules.

Example:

Correct:

attendance → students

Incorrect:

attendance → examinations

---

## Rule 3 — Reporting Modules Are Read-Only

Modules in the Analytics Layer must never modify operational data.

reports-analytics may only:

- read data
- aggregate data
- generate exports

They must never perform:

- inserts
- updates
- deletes

---

## Rule 4 — Notification Engine Is Event-Driven

Operational modules must not directly send:

- SMS
- Email
- Push notifications

Instead they emit events.

Example events:

student.created  
attendance.marked  
fee.payment_received  

The notification-engine consumes these events and sends notifications.

---

# Example Dependency Flow

Example scenario: student admission.

admissions  
→ students  
→ fees  
→ notification-engine  

This sequence ensures that:

- student identity is created first
- financial records are generated
- notifications are triggered through events

---

# Why This Architecture Is Important

Without dependency control:

- circular database references occur
- APIs become tightly coupled
- migrations become fragile
- modules become impossible to maintain

With this structure:

- modules remain independent
- schemas remain stable
- APIs remain modular
- the platform scales cleanly
```
