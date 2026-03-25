import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entities
import { AcademicYearEntity } from './entities/academic-year.entity';
import { ClassEntity } from './entities/class.entity';
import { SectionEntity } from './entities/section.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { SubjectEntity } from './entities/subject.entity';
import { SubjectGroupEntity } from './entities/subject-group.entity';
import { SubjectGroupItemEntity } from './entities/subject-group-item.entity';
import { ClassSectionSubjectEntity } from './entities/class-section-subject.entity';
import { ClassTeacherAssignmentEntity } from './entities/class-teacher-assignment.entity';
import { TeacherSubjectAssignmentEntity } from './entities/teacher-subject-assignment.entity';
import { TimetablePeriodEntity } from './entities/timetable-period.entity';
import { TimetableSlotEntity } from './entities/timetable-slot.entity';
import { TimetableSubstitutionEntity } from './entities/timetable-substitution.entity';

// Controllers
import { YearsController } from './endpoints/years/controller';
import { ClassesController } from './endpoints/classes/controller';
import { SectionsController } from './endpoints/sections/controller';
import { ClassSectionsController } from './endpoints/class-sections/controller';
import { SubjectsController } from './endpoints/subjects/controller';
import { SubjectGroupsController } from './endpoints/subject-groups/controller';
import { PromotionsController } from './endpoints/promotions/controller';
import { TimetablePeriodsController } from './endpoints/timetable-periods/controller';
import { TimetableSlotsController } from './endpoints/timetable-slots/controller';
import { TimetableSubstitutionsController } from './endpoints/timetable-substitutions/controller';

// Services
import { YearsService } from './endpoints/years/service';
import { ClassesService } from './endpoints/classes/service';
import { SectionsService } from './endpoints/sections/service';
import { ClassSectionsService } from './endpoints/class-sections/service';
import { SubjectsService } from './endpoints/subjects/service';
import { SubjectGroupsService } from './endpoints/subject-groups/service';
import { PromotionsService, PROMOTION_QUEUE } from './endpoints/promotions/service';
import { PromotionProcessor } from './endpoints/promotions/promotion.processor';
import { TimetablePeriodsService } from './endpoints/timetable-periods/service';
import { TimetableSlotsService } from './endpoints/timetable-slots/service';
import { TimetableSubstitutionsService } from './endpoints/timetable-substitutions/service';

@Module({
  imports: [
    BullModule.registerQueue({ name: PROMOTION_QUEUE }),
    TypeOrmModule.forFeature([
      AcademicYearEntity,
      ClassEntity,
      SectionEntity,
      ClassSectionEntity,
      SubjectEntity,
      SubjectGroupEntity,
      SubjectGroupItemEntity,
      ClassSectionSubjectEntity,
      ClassTeacherAssignmentEntity,
      TeacherSubjectAssignmentEntity,
      TimetablePeriodEntity,
      TimetableSlotEntity,
      TimetableSubstitutionEntity,
    ]),
  ],
  controllers: [
    YearsController,
    ClassesController,
    SectionsController,
    ClassSectionsController,
    SubjectsController,
    SubjectGroupsController,
    PromotionsController,
    TimetablePeriodsController,
    TimetableSlotsController,
    TimetableSubstitutionsController,
  ],
  providers: [
    YearsService,
    ClassesService,
    SectionsService,
    ClassSectionsService,
    SubjectsService,
    SubjectGroupsService,
    PromotionsService,
    PromotionProcessor,
    TimetablePeriodsService,
    TimetableSlotsService,
    TimetableSubstitutionsService,
  ],
  exports: [
    YearsService,
    ClassesService,
    SectionsService,
    ClassSectionsService,
    SubjectsService,
    TimetablePeriodsService,
    TimetableSlotsService,
  ],
})
export class AcademicsModule {}
