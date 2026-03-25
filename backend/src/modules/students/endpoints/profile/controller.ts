import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ProfileService } from './service';
import { UpsertProfileDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/:studentId/profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findOne(@Param('studentId') studentId: string, @CurrentSchool() schoolId: string) {
    return this.service.findByStudent(studentId, schoolId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  upsert(@Param('studentId') studentId: string, @Body() dto: UpsertProfileDto, @CurrentUser() user: AuthUser) {
    return this.service.upsert(studentId, dto, user);
  }
}
