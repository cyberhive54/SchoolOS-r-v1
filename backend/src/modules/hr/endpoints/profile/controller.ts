import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { StaffProfileService, UpsertProfileDto } from './service';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/staff/:staffId/profile')
export class StaffProfileController {
  constructor(private readonly service: StaffProfileService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  getProfile(@Param('staffId') staffId: string, @CurrentSchool() schoolId: string) {
    return this.service.getProfile(staffId, schoolId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.HR_STAFF_UPDATE)
  upsertProfile(@Param('staffId') staffId: string, @Body() dto: UpsertProfileDto, @CurrentUser() user: AuthUser) {
    return this.service.upsertProfile(staffId, dto, user);
  }
}
