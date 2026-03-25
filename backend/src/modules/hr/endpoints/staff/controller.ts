import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { StaffService } from './service';
import { CreateStaffDto, UpdateStaffDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PaginatedResponse } from '../../../../common/decorators/paginated-response.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HR_STAFF_CREATE)
  create(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @PaginatedResponse()
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  findAll(@CurrentSchool() schoolId: string, @Query() query: Record<string, unknown>) {
    return this.service.findAll(schoolId, query as never);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.service.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.HR_STAFF_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.HR_STAFF_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
