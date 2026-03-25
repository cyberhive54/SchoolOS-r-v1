import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { EnrollmentsService } from './service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/:studentId/enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_ENROLLMENT_MANAGE)
  create(@Param('studentId') studentId: string, @Body() dto: CreateEnrollmentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(studentId, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@Param('studentId') studentId: string, @CurrentSchool() schoolId: string) {
    return this.service.findAll(studentId, schoolId);
  }

  @Patch(':enrollmentId')
  @RequirePermissions(PERMISSIONS.STUDENTS_ENROLLMENT_MANAGE)
  update(
    @Param('studentId') studentId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(studentId, enrollmentId, dto, user);
  }
}
