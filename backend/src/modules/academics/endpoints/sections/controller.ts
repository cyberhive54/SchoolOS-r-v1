import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SectionsService } from './service';
import { CreateSectionDto, UpdateSectionDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_SECTION_MANAGE)
  create(@Body() dto: CreateSectionDto, @CurrentUser() user: AuthUser) {
    return this.sectionsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  findAll(@CurrentSchool() schoolId: string) {
    return this.sectionsService.findAll(schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_SECTION_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto, @CurrentUser() user: AuthUser) {
    return this.sectionsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_SECTION_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sectionsService.remove(id, user);
  }
}
