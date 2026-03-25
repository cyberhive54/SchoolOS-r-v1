import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SubjectsService } from './service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_MANAGE)
  create(@Body() dto: CreateSubjectDto, @CurrentUser() user: AuthUser) {
    return this.subjectsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_MANAGE)
  findAll(@CurrentSchool() schoolId: string, @Query('q') q?: string) {
    return this.subjectsService.findAll(schoolId, q);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_MANAGE)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.subjectsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @CurrentUser() user: AuthUser) {
    return this.subjectsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.subjectsService.remove(id, user);
  }
}
