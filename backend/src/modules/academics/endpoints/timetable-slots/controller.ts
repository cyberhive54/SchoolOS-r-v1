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
import { TimetableSlotsService } from './service';
import { CreateTimetableSlotDto, UpdateTimetableSlotDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/timetable/slots')
export class TimetableSlotsController {
  constructor(private readonly slotsService: TimetableSlotsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  create(@Body() dto: CreateTimetableSlotDto, @CurrentUser() user: AuthUser) {
    return this.slotsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findAll(
    @CurrentSchool() schoolId: string,
    @Query('academic_year_id') academicYearId: string,
    @Query('class_section_id') classSectionId?: string,
    @Query('staff_id') staffId?: string,
    @Query('day_of_week') dayOfWeek?: string,
  ) {
    return this.slotsService.findAll(schoolId, {
      academic_year_id: academicYearId,
      class_section_id: classSectionId,
      staff_id: staffId,
      day_of_week: dayOfWeek ? parseInt(dayOfWeek, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.slotsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateTimetableSlotDto, @CurrentUser() user: AuthUser) {
    return this.slotsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_TIMETABLE_WRITE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.slotsService.remove(id, user);
  }
}
