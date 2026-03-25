import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { LeaveTypesService } from './service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/leave-types')
export class LeaveTypesController {
  constructor(private readonly service: LeaveTypesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HR_LEAVE_MANAGE_TYPES)
  create(@Body() dto: CreateLeaveTypeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.HR_LEAVE_VIEW)
  findAll(@CurrentSchool() schoolId: string) {
    return this.service.findAll(schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_MANAGE_TYPES)
  update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.HR_LEAVE_MANAGE_TYPES)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
