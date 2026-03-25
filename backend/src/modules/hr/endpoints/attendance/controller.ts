import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendanceService } from './service';
import { BulkMarkAttendanceDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PaginatedResponse } from '../../../../common/decorators/paginated-response.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('bulk-mark')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.HR_ATTENDANCE_MARK)
  bulkMark(@Body() dto: BulkMarkAttendanceDto, @CurrentUser() user: AuthUser) {
    return this.service.bulkMark(dto, user);
  }

  @Get()
  @PaginatedResponse()
  @RequirePermissions(PERMISSIONS.HR_ATTENDANCE_VIEW)
  findAll(@CurrentSchool() schoolId: string, @Query() query: Record<string, unknown>) {
    return this.service.findAll(schoolId, query as never);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.HR_ATTENDANCE_VIEW)
  getSummary(
    @CurrentSchool() schoolId: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('staff_id') staffId?: string,
  ) {
    return this.service.getSummary(schoolId, dateFrom, dateTo, staffId);
  }
}
