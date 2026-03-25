import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entities ──────────────────────────────────────────────────────────────────
import { DepartmentEntity } from './entities/department.entity';
import { DesignationEntity } from './entities/designation.entity';
import { StaffEntity } from './entities/staff.entity';
import { StaffProfileEntity } from './entities/staff-profile.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { LeaveAllocationEntity } from './entities/leave-allocation.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { StaffAttendanceEntity } from './entities/staff-attendance.entity';
import { StaffDocumentEntity } from './entities/staff-document.entity';

// ── External entities needed for staff creation ───────────────────────────────
import { UserEntity } from '../users/entities/user.entity';
import { SchoolMembershipEntity } from '../users/entities/school-membership.entity';

// ── Controllers ───────────────────────────────────────────────────────────────
import { DepartmentsController } from './endpoints/departments/controller';
import { DesignationsController } from './endpoints/designations/controller';
import { StaffController } from './endpoints/staff/controller';
import { StaffProfileController } from './endpoints/profile/controller';
import { LeaveTypesController } from './endpoints/leave-types/controller';
import { LeaveAllocationsController } from './endpoints/leave-allocations/controller';
import { LeaveRequestsController } from './endpoints/leave-requests/controller';
import { AttendanceController } from './endpoints/attendance/controller';
import { StaffDocumentsController } from './endpoints/staff-documents/controller';

// ── Services ──────────────────────────────────────────────────────────────────
import { DepartmentsService } from './endpoints/departments/service';
import { DesignationsService } from './endpoints/designations/service';
import { StaffService } from './endpoints/staff/service';
import { StaffProfileService } from './endpoints/profile/service';
import { LeaveTypesService } from './endpoints/leave-types/service';
import { LeaveAllocationsService } from './endpoints/leave-allocations/service';
import { LeaveRequestsService } from './endpoints/leave-requests/service';
import { AttendanceService } from './endpoints/attendance/service';
import { StaffDocumentsService } from './endpoints/staff-documents/service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DepartmentEntity,
      DesignationEntity,
      StaffEntity,
      StaffProfileEntity,
      LeaveTypeEntity,
      LeaveAllocationEntity,
      LeaveRequestEntity,
      StaffAttendanceEntity,
      StaffDocumentEntity,
      // External — needed for creating user accounts when staff is added
      UserEntity,
      SchoolMembershipEntity,
    ]),
  ],
  controllers: [
    DepartmentsController,
    DesignationsController,
    StaffController,
    StaffProfileController,
    LeaveTypesController,
    LeaveAllocationsController,
    LeaveRequestsController,
    AttendanceController,
    StaffDocumentsController,
  ],
  providers: [
    DepartmentsService,
    DesignationsService,
    StaffService,
    StaffProfileService,
    LeaveTypesService,
    LeaveAllocationsService,
    LeaveRequestsService,
    AttendanceService,
    StaffDocumentsService,
  ],
  exports: [
    StaffService,
    DepartmentsService,
    DesignationsService,
  ],
})
export class HRModule {}
