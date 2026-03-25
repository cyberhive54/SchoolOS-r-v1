import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { GuardiansService } from './service';
import { CreateGuardianDto, UpdateGuardianDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/:studentId/guardians')
export class GuardiansController {
  constructor(private readonly service: GuardiansService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@Param('studentId') studentId: string, @CurrentSchool() schoolId: string) {
    return this.service.findAll(studentId, schoolId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_GUARDIAN_MANAGE)
  create(@Param('studentId') studentId: string, @Body() dto: CreateGuardianDto, @CurrentUser() user: AuthUser) {
    return this.service.create(studentId, dto, user);
  }

  @Patch(':guardianId')
  @RequirePermissions(PERMISSIONS.STUDENTS_GUARDIAN_MANAGE)
  update(
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string,
    @Body() dto: UpdateGuardianDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(studentId, guardianId, dto, user);
  }

  @Delete(':guardianId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS_GUARDIAN_MANAGE)
  remove(@Param('studentId') studentId: string, @Param('guardianId') guardianId: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(studentId, guardianId, user);
  }
}
