import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LeaveAllocationsService } from './service';
import { BulkAllocateDto, UpdateAllocationDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr')
export class LeaveAllocationsController {
  constructor(private readonly service: LeaveAllocationsService) {}

  @Post('leave-allocations/bulk')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.HR_LEAVE_MANAGE_ALLOCATIONS)
  bulkAllocate(@Body() dto: BulkAllocateDto, @CurrentUser() user: AuthUser) {
    return this.service.bulkAllocate(dto, user);
  }

  @Get('staff/:staffId/leave-allocations')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_VIEW)
  findByStaff(
    @Param('staffId') staffId: string,
    @CurrentSchool() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
  ) {
    return this.service.findByStaff(staffId, schoolId, academicYearId);
  }

  @Patch('leave-allocations/:id')
  @RequirePermissions(PERMISSIONS.HR_LEAVE_MANAGE_ALLOCATIONS)
  update(@Param('id') id: string, @Body() dto: UpdateAllocationDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }
}
