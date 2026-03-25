import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DesignationsService } from './service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/designations')
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HR_SETTINGS_MANAGE)
  create(@Body() dto: CreateDesignationDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  findAll(@CurrentSchool() schoolId: string, @Query('department_id') departmentId?: string) {
    return this.service.findAll(schoolId, departmentId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.HR_SETTINGS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateDesignationDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.HR_SETTINGS_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
