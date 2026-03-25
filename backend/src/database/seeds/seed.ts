/**
 * seed.ts — Development seed script
 *
 * Creates:
 *   1. One development school (slug: "demo", domain: null)
 *   2. One super_admin user (email: admin@demo.schoolos.com, password: Admin@123)
 *   3. Role permissions for all roles
 *   4. Permissions catalog (master list of all permission strings)
 *
 * Run with:
 *   pnpm --filter schoolos-backend run seed
 *
 * NEVER run this in production. Use environment check guard at the top.
 */

import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ROLE_DEFAULT_PERMISSIONS, PERMISSIONS } from '@schoolos/config';
import { SchoolEntity } from '../../modules/schools/entities/school.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { SchoolMembershipEntity } from '../../modules/users/entities/school-membership.entity';
import { RolePermissionEntity } from '../../modules/platform/permissions/entities/role-permission.entity';
import { PermissionEntity } from '../../modules/platform/permissions/entities/permission.entity';
import { AcademicYearEntity } from '../../modules/academics/entities/academic-year.entity';
import { ClassEntity } from '../../modules/academics/entities/class.entity';
import { SectionEntity } from '../../modules/academics/entities/section.entity';
import { ClassSectionEntity } from '../../modules/academics/entities/class-section.entity';
import { SubjectEntity } from '../../modules/academics/entities/subject.entity';
import { ClassSectionSubjectEntity } from '../../modules/academics/entities/class-section-subject.entity';
import { StudentCategoryEntity } from '../../modules/students/entities/student-category.entity';
import { StudentHouseEntity } from '../../modules/students/entities/student-house.entity';
import { StudentEntity } from '../../modules/students/entities/student.entity';
import { DepartmentEntity } from '../../modules/hr/entities/department.entity';
import { DesignationEntity } from '../../modules/hr/entities/designation.entity';
import { LeaveTypeEntity } from '../../modules/hr/entities/leave-type.entity';
import { StaffEntity } from '../../modules/hr/entities/staff.entity';
import { join } from 'path';
import { resolveMigrationDatabaseConnectionOptions } from '../connection-options';

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed.ts must not be run in production!');
  process.exit(1);
}

async function seed(): Promise<void> {
  const db = resolveMigrationDatabaseConnectionOptions();
  const dataSource = new DataSource({
    type: 'postgres',
    url: db.url,
    ssl: db.ssl,
    synchronize: false,
    logging: true,
    entities: [
      join(__dirname, '../../modules/**/*.entity.{ts,js}'),
    ],
  });

  await dataSource.initialize();
  console.log(`Database URL source: ${db.source}`);
  console.log(`Database SSL mode: ${db.sslMode}`);
  console.log('Database connected for seeding...');

  try {
    // ── Seed school ─────────────────────────────────────────────────────────
    const schoolRepo = dataSource.getRepository(SchoolEntity);
    let school = await schoolRepo.findOne({ where: { slug: 'demo' } });

    if (!school) {
      school = schoolRepo.create({
        id: uuidv4(),
        name: 'Demo School',
        slug: 'demo',
        domain: null,
        active_modules: [
          'students', 'academics', 'attendance', 'fees',
          'examinations', 'communication', 'hr', 'admissions',
        ],
        subscription_tier: 'enterprise',
        theme: {
          color_primary: '#1e40af',
          color_secondary: '#1e3a8a',
          color_accent: '#3b82f6',
          color_surface: '#f8fafc',
          radius_md: '0.5rem',
          radius_lg: '0.75rem',
          font_heading: 'Inter',
          font_body: 'Inter',
        },
        is_active: true,
      });
      await schoolRepo.save(school);
      console.log(`✓ School created: ${school.name} (id: ${school.id})`);
    } else {
      console.log(`  School already exists: ${school.name}`);
    }

    // ── Seed super_admin user ────────────────────────────────────────────────
    const userRepo = dataSource.getRepository(UserEntity);
    let user = await userRepo.findOne({ where: { email: 'admin@demo.schoolos.com' } });

    if (!user) {
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      user = userRepo.create({
        id: uuidv4(),
        email: 'admin@demo.schoolos.com',
        first_name: 'Admin',
        last_name: 'User',
        password_hash: passwordHash,
        is_active: true,
      });
      await userRepo.save(user);
      console.log(`✓ Super admin created: ${user.email}`);
    } else {
      console.log(`  Super admin already exists: ${user.email}`);
    }

    // ── Seed school membership ───────────────────────────────────────────────
    const membershipRepo = dataSource.getRepository(SchoolMembershipEntity);
    const existingMembership = await membershipRepo.findOne({
      where: { school_id: school.id, user_id: user.id },
    });

    if (!existingMembership) {
      const membership = membershipRepo.create({
        id: uuidv4(),
        school_id: school.id,
        user_id: user.id,
        role: 'super_admin',
        is_active: true,
      });
      await membershipRepo.save(membership);
      console.log(`✓ Membership created: ${user.email} → super_admin @ ${school.name}`);
    } else {
      console.log(`  Membership already exists`);
    }

    // ── Seed permissions catalog ─────────────────────────────────────────────
    // Inserts all defined permission strings into the master `permissions` table.
    // Each entry is derived from the dot-notation format: "{module}.{resource}.{action}"
    const permCatalogRepo = dataSource.getRepository(PermissionEntity);
    let permCatalogInserted = 0;

    for (const permKey of Object.values(PERMISSIONS)) {
      const existing = await permCatalogRepo.findOne({
        where: { permission_key: permKey },
      });
      if (!existing) {
        const parts = permKey.split('.');
        const [module, resource, action] = parts;
        const entry = permCatalogRepo.create({
          id: uuidv4(),
          permission_key: permKey,
          module: module ?? permKey,
          resource: resource ?? permKey,
          action: action ?? permKey,
          description: null,
        });
        await permCatalogRepo.save(entry);
        permCatalogInserted++;
      }
    }
    console.log(`✓ Permissions catalog seeded: ${permCatalogInserted} new entries`);

    // ── Seed role permissions ────────────────────────────────────────────────
    const permRepo = dataSource.getRepository(RolePermissionEntity);
    let totalInserted = 0;

    for (const [role, permissions] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      for (const permission of permissions) {
        const existing = await permRepo.findOne({ where: { role: role as never, permission } });
        if (!existing) {
          const rp = permRepo.create({
            id: uuidv4(),
            role: role as never,
            permission,
          });
          await permRepo.save(rp);
          totalInserted++;
        }
      }
    }
    console.log(`✓ Role permissions seeded: ${totalInserted} new entries`);

    // ── Seed academic data ──────────────────────────────────────────────────
    // Spec: 1 academic year (2025-26, current), 3 classes, 2 sections each,
    //       5 core subjects, all wired into class-sections.
    const yearRepo = dataSource.getRepository(AcademicYearEntity);
    const classRepo = dataSource.getRepository(ClassEntity);
    const sectionRepo = dataSource.getRepository(SectionEntity);
    const classSectionRepo = dataSource.getRepository(ClassSectionEntity);
    const subjectRepo = dataSource.getRepository(SubjectEntity);
    const classSectionSubjectRepo = dataSource.getRepository(ClassSectionSubjectEntity);

    let academicYear = await yearRepo.findOne({ where: { school_id: school.id, name: '2025-26' } });
    if (!academicYear) {
      academicYear = yearRepo.create({ id: uuidv4(), school_id: school.id, name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: true });
      await yearRepo.save(academicYear);
      console.log('✓ Academic year seeded: 2025-26');
    }

    // 3 demo classes
    const classDefs = [
      { name: 'Grade 1', order_index: 1 },
      { name: 'Grade 2', order_index: 2 },
      { name: 'Grade 3', order_index: 3 },
    ];
    const savedClasses: ClassEntity[] = [];
    for (const cls of classDefs) {
      let existing = await classRepo.findOne({ where: { school_id: school.id, name: cls.name } });
      if (!existing) {
        existing = await classRepo.save(classRepo.create({ id: uuidv4(), school_id: school.id, name: cls.name, order_index: cls.order_index }));
        console.log(`✓ Class seeded: ${cls.name}`);
      }
      savedClasses.push(existing);
    }

    // 2 sections each
    const sectionDefs = ['A', 'B'];
    const savedSections: SectionEntity[] = [];
    for (const name of sectionDefs) {
      let existing = await sectionRepo.findOne({ where: { school_id: school.id, name } });
      if (!existing) {
        existing = await sectionRepo.save(sectionRepo.create({ id: uuidv4(), school_id: school.id, name }));
        console.log(`✓ Section seeded: ${name}`);
      }
      savedSections.push(existing);
    }

    // 5 core subjects
    const subjectDefs = [
      { name: 'English', code: 'ENG', type: 'core' as const },
      { name: 'Mathematics', code: 'MATH', type: 'core' as const },
      { name: 'Science', code: 'SCI', type: 'core' as const },
      { name: 'Social Studies', code: 'SST', type: 'core' as const },
      { name: 'Hindi', code: 'HIN', type: 'core' as const },
    ];
    const savedSubjects: SubjectEntity[] = [];
    for (const subj of subjectDefs) {
      let existing = await subjectRepo.findOne({ where: { school_id: school.id, code: subj.code } });
      if (!existing) {
        existing = await subjectRepo.save(subjectRepo.create({ id: uuidv4(), school_id: school.id, name: subj.name, code: subj.code, type: subj.type }));
        console.log(`✓ Subject seeded: ${subj.name}`);
      }
      savedSubjects.push(existing);
    }

    // Wire class-sections (3 classes × 2 sections = 6 class-sections)
    const savedClassSections: ClassSectionEntity[] = [];
    for (const cls of savedClasses) {
      for (const sec of savedSections) {
        let existing = await classSectionRepo.findOne({
          where: { school_id: school.id, class_id: cls.id, section_id: sec.id, academic_year_id: academicYear.id },
        });
        if (!existing) {
          existing = await classSectionRepo.save(classSectionRepo.create({
            id: uuidv4(),
            school_id: school.id,
            class_id: cls.id,
            section_id: sec.id,
            academic_year_id: academicYear.id,
            capacity: 40,
            room_no: null,
          }));
          console.log(`✓ Class-section seeded: ${cls.name}-${sec.name}`);
        }
        savedClassSections.push(existing);
      }
    }

    // Assign all 5 subjects to each class-section
    let csSubjectsInserted = 0;
    for (const cs of savedClassSections) {
      for (const subj of savedSubjects) {
        const existing = await classSectionSubjectRepo.findOne({
          where: { class_section_id: cs.id, subject_id: subj.id },
        });
        if (!existing) {
          await classSectionSubjectRepo.save(classSectionSubjectRepo.create({
            id: uuidv4(),
            school_id: school.id,
            class_section_id: cs.id,
            subject_id: subj.id,
          }));
          csSubjectsInserted++;
        }
      }
    }
    if (csSubjectsInserted > 0) console.log(`✓ Class-section subjects seeded: ${csSubjectsInserted} assignments`);

    // ── Seed student categories ──────────────────────────────────────────────
    const categoryRepo = dataSource.getRepository(StudentCategoryEntity);
    const categoryDefs = [
      { name: 'General', code: 'GEN', description: 'General category' },
      { name: 'Scheduled Caste', code: 'SC', description: null },
      { name: 'Scheduled Tribe', code: 'ST', description: null },
      { name: 'Other Backward Class', code: 'OBC', description: null },
      { name: 'Economically Weaker Section', code: 'EWS', description: null },
    ];
    const savedCategories: StudentCategoryEntity[] = [];
    for (const cat of categoryDefs) {
      let existing = await categoryRepo.findOne({ where: { school_id: school.id, code: cat.code } });
      if (!existing) {
        existing = await categoryRepo.save(categoryRepo.create({
          id: uuidv4(), school_id: school.id, name: cat.name, code: cat.code, description: cat.description, is_active: true,
        }));
        console.log(`✓ Student category seeded: ${cat.name}`);
      }
      savedCategories.push(existing);
    }

    // ── Seed student houses ──────────────────────────────────────────────────
    const houseRepo = dataSource.getRepository(StudentHouseEntity);
    const houseDefs = [
      { name: 'Red House', color_hex: '#ef4444', description: null },
      { name: 'Blue House', color_hex: '#3b82f6', description: null },
      { name: 'Green House', color_hex: '#22c55e', description: null },
      { name: 'Yellow House', color_hex: '#eab308', description: null },
    ];
    for (const house of houseDefs) {
      const existing = await houseRepo.findOne({ where: { school_id: school.id, name: house.name } });
      if (!existing) {
        await houseRepo.save(houseRepo.create({
          id: uuidv4(), school_id: school.id, name: house.name, color_hex: house.color_hex, description: house.description, is_active: true,
        }));
        console.log(`✓ Student house seeded: ${house.name}`);
      }
    }

    // ── Seed demo students ───────────────────────────────────────────────────
    const studentRepo = dataSource.getRepository(StudentEntity);
    const genCategory = savedCategories.find(c => c.code === 'GEN');
    const obcCategory = savedCategories.find(c => c.code === 'OBC');

    const studentDefs = [
      { admission_no: 'ADM-2025-001', first_name: 'Arjun', last_name: 'Sharma', gender: 'male' as const, dob: '2015-04-10', blood_group: 'O+', category_id: genCategory?.id ?? null },
      { admission_no: 'ADM-2025-002', first_name: 'Priya', last_name: 'Patel', gender: 'female' as const, dob: '2015-08-22', blood_group: 'A+', category_id: obcCategory?.id ?? null },
      { admission_no: 'ADM-2025-003', first_name: 'Rohan', last_name: 'Verma', gender: 'male' as const, dob: '2014-12-01', blood_group: 'B+', category_id: genCategory?.id ?? null },
      { admission_no: 'ADM-2025-004', first_name: 'Sneha', last_name: 'Gupta', gender: 'female' as const, dob: '2016-02-14', blood_group: 'AB-', category_id: genCategory?.id ?? null },
      { admission_no: 'ADM-2025-005', first_name: 'Kiran', last_name: 'Kumar', gender: 'male' as const, dob: '2015-06-30', blood_group: 'O-', category_id: obcCategory?.id ?? null },
    ];

    let studentsInserted = 0;
    for (const s of studentDefs) {
      const existing = await studentRepo.findOne({ where: { school_id: school.id, admission_no: s.admission_no } });
      if (!existing) {
        await studentRepo.save(studentRepo.create({
          id: uuidv4(),
          school_id: school.id,
          admission_no: s.admission_no,
          first_name: s.first_name,
          middle_name: null,
          last_name: s.last_name,
          date_of_birth: s.dob,
          gender: s.gender,
          blood_group: s.blood_group,
          religion: 'Hindu',
          caste: null,
          nationality: 'Indian',
          aadhaar_no: null,
          category_id: s.category_id,
          house_id: null,
          status: 'active',
          profile_photo_url: null,
        }));
        studentsInserted++;
      }
    }
    if (studentsInserted > 0) console.log(`✓ Demo students seeded: ${studentsInserted}`);

    // ── Seed HR Departments ──────────────────────────────────────────────────
    const deptRepo = dataSource.getRepository(DepartmentEntity);
    const deptDefs = [
      { name: 'Teaching', description: 'All teaching staff' },
      { name: 'Administration', description: 'Office and admin staff' },
    ];
    const savedDepts: DepartmentEntity[] = [];
    for (const d of deptDefs) {
      let existing = await deptRepo.findOne({ where: { school_id: school.id, name: d.name, is_active: true } });
      if (!existing) {
        existing = await deptRepo.save(deptRepo.create({ id: uuidv4(), school_id: school.id, name: d.name, description: d.description, is_active: true }));
        console.log(`✓ Department seeded: ${d.name}`);
      }
      savedDepts.push(existing);
    }
    const teachingDept = savedDepts.find(d => d.name === 'Teaching');
    const adminDept = savedDepts.find(d => d.name === 'Administration');

    // ── Seed HR Designations ─────────────────────────────────────────────────
    const desRepo = dataSource.getRepository(DesignationEntity);
    const desDefs = [
      { name: 'Principal', department_id: adminDept?.id ?? null, level: 1, is_teaching_staff: false },
      { name: 'Senior Teacher', department_id: teachingDept?.id ?? null, level: 2, is_teaching_staff: true },
      { name: 'Teacher', department_id: teachingDept?.id ?? null, level: 3, is_teaching_staff: true },
    ];
    const savedDes: DesignationEntity[] = [];
    for (const d of desDefs) {
      let existing = await desRepo.findOne({ where: { school_id: school.id, name: d.name } });
      if (!existing) {
        existing = await desRepo.save(desRepo.create({ id: uuidv4(), school_id: school.id, name: d.name, department_id: d.department_id, level: d.level, is_teaching_staff: d.is_teaching_staff, is_active: true }));
        console.log(`✓ Designation seeded: ${d.name}`);
      }
      savedDes.push(existing);
    }
    const teacherDes = savedDes.find(d => d.name === 'Teacher');

    // ── Seed HR Leave Types ──────────────────────────────────────────────────
    const ltRepo = dataSource.getRepository(LeaveTypeEntity);
    const ltDefs = [
      { name: 'Casual Leave', code: 'CL', max_days_per_year: 12, is_paid: true, carry_forward: false, applicable_to: 'all' as const },
      { name: 'Sick Leave', code: 'SL', max_days_per_year: 10, is_paid: true, carry_forward: false, applicable_to: 'all' as const },
      { name: 'Earned Leave', code: 'EL', max_days_per_year: 20, is_paid: true, carry_forward: true, applicable_to: 'all' as const },
    ];
    for (const lt of ltDefs) {
      const existing = await ltRepo.findOne({ where: { school_id: school.id, code: lt.code } });
      if (!existing) {
        await ltRepo.save(ltRepo.create({ id: uuidv4(), school_id: school.id, name: lt.name, code: lt.code, max_days_per_year: lt.max_days_per_year, is_paid: lt.is_paid, carry_forward: lt.carry_forward, applicable_to: lt.applicable_to, is_active: true }));
        console.log(`✓ Leave type seeded: ${lt.name}`);
      }
    }

    // ── Seed demo Staff ──────────────────────────────────────────────────────
    const staffRepo = dataSource.getRepository(StaffEntity);
    const staffDefs = [
      { employee_id: 'EMP-001', first_name: 'Rajesh', last_name: 'Sharma', phone: '9876543210', join_date: '2020-06-01', employment_type: 'permanent' as const, department_id: teachingDept?.id ?? null, designation_id: teacherDes?.id ?? null, gender: 'male' as const },
      { employee_id: 'EMP-002', first_name: 'Sunita', last_name: 'Verma', phone: '9876543211', join_date: '2019-07-15', employment_type: 'permanent' as const, department_id: teachingDept?.id ?? null, designation_id: teacherDes?.id ?? null, gender: 'female' as const },
    ];
    for (const s of staffDefs) {
      const existing = await staffRepo.findOne({ where: { school_id: school.id, employee_id: s.employee_id } });
      if (!existing) {
        await staffRepo.save(staffRepo.create({ id: uuidv4(), school_id: school.id, user_id: null, employee_id: s.employee_id, first_name: s.first_name, last_name: s.last_name, phone: s.phone, join_date: s.join_date, employment_type: s.employment_type, status: 'active', department_id: s.department_id, designation_id: s.designation_id, gender: s.gender, date_of_birth: null, blood_group: null, alternate_phone: null, personal_email: null, salary_grade: null }));
        console.log(`✓ Staff seeded: ${s.first_name} ${s.last_name} (${s.employee_id})`);
      }
    }

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────────────');
    console.log(`  School slug:    demo`);
    console.log(`  X-School-ID:    ${school.id}`);
    console.log(`  Admin email:    admin@demo.schoolos.com`);
    console.log(`  Admin password: Admin@123`);
    console.log('─────────────────────────────────────────');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
