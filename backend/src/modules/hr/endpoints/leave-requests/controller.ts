import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LeaveRequestsService } from './service';
import { CreateLeaveRequestDto, ReviewLeaveRequestDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PaginatedResponse } from '../../../../common/decorators/paginated-response.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HR_LEAVE_REQUEST)
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @PaginatedResponse()
  @RequirePermissions(PERMISSIONS.HR_LEAVE_VIEW)
  findAll(@CurrentSchool() schoolId: string, @Query() query: Record<string, unknown>) {
    return this.service.findAll(schoolId, query as never);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_VIEW)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.service.findOne(id, schoolId);
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_APPROVE)
  approve(@Param('id') id: string, @Body() dto: ReviewLeaveRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.approve(id, dto, user);
  }

  @Post(':id/reject')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_APPROVE)
  reject(@Param('id') id: string, @Body() dto: ReviewLeaveRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.HR_LEAVE_REQUEST)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user);
  }
}
