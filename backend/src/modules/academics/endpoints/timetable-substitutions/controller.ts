import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TimetableSubstitutionsService } from './service';
import { CreateTimetableSubstitutionDto, UpdateTimetableSubstitutionDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/timetable/substitutions')
export class TimetableSubstitutionsController {
  constructor(private readonly subsService: TimetableSubstitutionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  create(@Body() dto: CreateTimetableSubstitutionDto, @CurrentUser() user: AuthUser) {
    return this.subsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findAll(
    @CurrentSchool() schoolId: string,
    @Query('date') date?: string,
    @Query('absent_staff_id') absentStaffId?: string,
  ) {
    return this.subsService.findAll(schoolId, { date, absent_staff_id: absentStaffId });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.subsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateTimetableSubstitutionDto, @CurrentUser() user: AuthUser) {
    return this.subsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.subsService.remove(id, user);
  }
}
