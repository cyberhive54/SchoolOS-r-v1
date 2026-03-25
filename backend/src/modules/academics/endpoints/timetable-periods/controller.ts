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
import { TimetablePeriodsService } from './service';
import { CreateTimetablePeriodDto, UpdateTimetablePeriodDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/timetable/periods')
export class TimetablePeriodsController {
  constructor(private readonly periodsService: TimetablePeriodsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  create(@Body() dto: CreateTimetablePeriodDto, @CurrentUser() user: AuthUser) {
    return this.periodsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findAll(@CurrentSchool() schoolId: string, @Query('academic_year_id') academicYearId: string) {
    return this.periodsService.findAll(schoolId, academicYearId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.periodsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateTimetablePeriodDto, @CurrentUser() user: AuthUser) {
    return this.periodsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.periodsService.remove(id, user);
  }
}
