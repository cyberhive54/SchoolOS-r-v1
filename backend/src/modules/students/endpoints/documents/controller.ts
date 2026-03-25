import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StudentDocumentsService } from './service';
import { CreateStudentDocumentDto, UpdateStudentDocumentDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/:id/documents')
export class StudentDocumentsController {
  constructor(private readonly docsService: StudentDocumentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  create(@Param('id') id: string, @Body() dto: CreateStudentDocumentDto, @CurrentUser() user: AuthUser) {
    return this.docsService.create(id, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.docsService.findAll(id, schoolId);
  }

  @Get(':docId')
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findOne(@Param('id') id: string, @Param('docId') docId: string, @CurrentSchool() schoolId: string) {
    return this.docsService.findOne(docId, id, schoolId);
  }

  @Patch(':docId')
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  update(@Param('id') id: string, @Param('docId') docId: string, @Body() dto: UpdateStudentDocumentDto, @CurrentUser() user: AuthUser) {
    return this.docsService.update(docId, id, dto, user);
  }

  @Delete(':docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  remove(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: AuthUser) {
    return this.docsService.remove(docId, id, user);
  }
}
