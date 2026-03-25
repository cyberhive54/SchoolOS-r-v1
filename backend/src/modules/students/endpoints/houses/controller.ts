import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { HousesService } from './service';
import { CreateHouseDto, UpdateHouseDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/houses')
export class HousesController {
  constructor(private readonly service: HousesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_SETTINGS_MANAGE)
  create(@Body() dto: CreateHouseDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@CurrentSchool() schoolId: string) {
    return this.service.findAll(schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STUDENTS_SETTINGS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateHouseDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS_SETTINGS_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
