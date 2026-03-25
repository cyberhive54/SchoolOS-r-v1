import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entities
import { StudentCategoryEntity } from './entities/student-category.entity';
import { StudentHouseEntity } from './entities/student-house.entity';
import { StudentEntity } from './entities/student.entity';
import { StudentProfileEntity } from './entities/student-profile.entity';
import { GuardianEntity } from './entities/guardian.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { StudentEnrollmentEntity } from './entities/student-enrollment.entity';
import { StudentSiblingEntity } from './entities/student-sibling.entity';
import { StudentDocumentEntity } from './entities/student-document.entity';

// Controllers
import { CategoriesController } from './endpoints/categories/controller';
import { HousesController } from './endpoints/houses/controller';
import { StudentsController } from './endpoints/students/controller';
import { ProfileController } from './endpoints/profile/controller';
import { GuardiansController } from './endpoints/guardians/controller';
import { EnrollmentsController } from './endpoints/enrollments/controller';
import { BulkImportController } from './endpoints/bulk-import/controller';
import { SiblingsController } from './endpoints/siblings/controller';
import { StudentDocumentsController } from './endpoints/documents/controller';

// Services
import { CategoriesService } from './endpoints/categories/service';
import { HousesService } from './endpoints/houses/service';
import { StudentsService } from './endpoints/students/service';
import { ProfileService } from './endpoints/profile/service';
import { GuardiansService } from './endpoints/guardians/service';
import { EnrollmentsService } from './endpoints/enrollments/service';
import { BulkImportService, STUDENTS_BULK_IMPORT_QUEUE } from './endpoints/bulk-import/service';
import { BulkImportProcessor } from './endpoints/bulk-import/bulk-import.processor';
import { SiblingsService } from './endpoints/siblings/service';
import { StudentDocumentsService } from './endpoints/documents/service';

@Module({
  imports: [
    BullModule.registerQueue({ name: STUDENTS_BULK_IMPORT_QUEUE }),
    TypeOrmModule.forFeature([
      StudentCategoryEntity,
      StudentHouseEntity,
      StudentEntity,
      StudentProfileEntity,
      GuardianEntity,
      StudentGuardianEntity,
      StudentEnrollmentEntity,
      StudentSiblingEntity,
      StudentDocumentEntity,
    ]),
  ],
  controllers: [
    CategoriesController,
    HousesController,
    StudentsController,
    ProfileController,
    GuardiansController,
    EnrollmentsController,
    BulkImportController,
    SiblingsController,
    StudentDocumentsController,
  ],
  providers: [
    CategoriesService,
    HousesService,
    StudentsService,
    ProfileService,
    GuardiansService,
    EnrollmentsService,
    BulkImportService,
    BulkImportProcessor,
    SiblingsService,
    StudentDocumentsService,
  ],
  exports: [
    StudentsService,
    EnrollmentsService,
    CategoriesService,
    HousesService,
    SiblingsService,
  ],
})
export class StudentsModule {}
