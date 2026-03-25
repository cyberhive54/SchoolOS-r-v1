import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SubjectGroupsService } from './service';
import { CreateSubjectGroupDto, UpdateSubjectGroupDto, AddSubjectToGroupDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/subject-groups')
export class SubjectGroupsController {
  constructor(private readonly subjectGroupsService: SubjectGroupsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  create(@Body() dto: CreateSubjectGroupDto, @CurrentUser() user: AuthUser) {
    return this.subjectGroupsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  findAll(@CurrentSchool() schoolId: string) {
    return this.subjectGroupsService.findAll(schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectGroupDto, @CurrentUser() user: AuthUser) {
    return this.subjectGroupsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.subjectGroupsService.remove(id, user);
  }

  @Post(':id/subjects')
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  addSubject(@Param('id') id: string, @Body() dto: AddSubjectToGroupDto, @CurrentUser() user: AuthUser) {
    return this.subjectGroupsService.addSubject(id, dto.subject_id, user);
  }

  @Delete(':id/subjects/:subjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_SUBJECT_GROUP_MANAGE)
  removeSubject(@Param('id') id: string, @Param('subjectId') subjectId: string, @CurrentUser() user: AuthUser) {
    return this.subjectGroupsService.removeSubject(id, subjectId, user);
  }
}
