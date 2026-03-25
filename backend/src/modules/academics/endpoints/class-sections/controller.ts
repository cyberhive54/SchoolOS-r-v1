import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassSectionsService } from './service';
import { CreateClassSectionDto, UpdateClassSectionDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import { IsUUID } from 'class-validator';
import type { AuthUser } from '@schoolos/types';

class AssignSubjectDto {
  @IsUUID()
  subject_id!: string;
}

class AssignSubjectTeacherDto {
  @IsUUID()
  subject_id!: string;

  @IsUUID()
  user_id!: string;
}

class AssignClassTeacherDto {
  @IsUUID()
  user_id!: string;
}

@Controller('academics/class-sections')
export class ClassSectionsController {
  constructor(private readonly classSectionsService: ClassSectionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE)
  create(@Body() dto: CreateClassSectionDto, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  findAll(
    @CurrentSchool() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
    @Query('class_id') classId?: string,
  ) {
    return this.classSectionsService.findAll(schoolId, { academic_year_id: academicYearId, class_id: classId });
  }

  @Get('subject-teachers')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  listAllSubjectTeachers(
    @CurrentSchool() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
  ) {
    return this.classSectionsService.listAllSubjectTeachers(schoolId, { academic_year_id: academicYearId });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.classSectionsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateClassSectionDto, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.remove(id, user);
  }

  // Subject sub-resource
  @Post(':id/subjects')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  assignSubject(@Param('id') id: string, @Body() dto: AssignSubjectDto, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.assignSubject(id, dto.subject_id, user);
  }

  @Delete(':id/subjects/:subjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_SECTION_MANAGE)
  removeSubject(@Param('id') id: string, @Param('subjectId') subjectId: string, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.removeSubject(id, subjectId, user);
  }

  @Get(':id/subjects')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  getSubjects(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.classSectionsService.getSubjects(id, schoolId);
  }

  // Class teacher sub-resource
  @Post(':id/class-teacher')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TEACHER_ASSIGNMENT_MANAGE)
  assignClassTeacher(@Param('id') id: string, @Body() dto: AssignClassTeacherDto, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.assignClassTeacher(id, dto.user_id, user);
  }

  @Delete(':id/class-teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_TEACHER_ASSIGNMENT_MANAGE)
  removeClassTeacher(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.removeClassTeacher(id, user);
  }

  // Subject teacher sub-resource
  @Post(':id/subject-teachers')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TEACHER_ASSIGNMENT_MANAGE)
  assignSubjectTeacher(@Param('id') id: string, @Body() dto: AssignSubjectTeacherDto, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.assignSubjectTeacher(id, dto.subject_id, dto.user_id, user);
  }

  @Delete(':id/subject-teachers/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_TEACHER_ASSIGNMENT_MANAGE)
  removeSubjectTeacher(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @CurrentUser() user: AuthUser) {
    return this.classSectionsService.removeSubjectTeacher(id, assignmentId, user);
  }

  @Get(':id/teachers')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  getTeachers(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.classSectionsService.getTeachers(id, schoolId);
  }
}
