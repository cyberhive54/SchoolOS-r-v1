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
import { StudentsService } from './service';
import { CreateStudentDto, UpdateStudentDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PaginatedResponse } from '../../../../common/decorators/paginated-response.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_CREATE)
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @PaginatedResponse()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@CurrentSchool() schoolId: string, @Query() query: Record<string, unknown>) {
    return this.service.findAll(schoolId, query as never);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.service.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
