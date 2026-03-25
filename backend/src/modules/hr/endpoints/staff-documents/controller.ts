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
import { StaffDocumentsService } from './service';
import { CreateStaffDocumentDto, UpdateStaffDocumentDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('hr/staff/:id/documents')
export class StaffDocumentsController {
  constructor(private readonly docsService: StaffDocumentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HR_STAFF_UPDATE)
  create(@Param('id') id: string, @Body() dto: CreateStaffDocumentDto, @CurrentUser() user: AuthUser) {
    return this.docsService.create(id, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  findAll(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.docsService.findAll(id, schoolId);
  }

  @Get(':docId')
  @RequirePermissions(PERMISSIONS.HR_STAFF_VIEW)
  findOne(@Param('id') id: string, @Param('docId') docId: string, @CurrentSchool() schoolId: string) {
    return this.docsService.findOne(docId, id, schoolId);
  }

  @Patch(':docId')
  @RequirePermissions(PERMISSIONS.HR_STAFF_UPDATE)
  update(@Param('id') id: string, @Param('docId') docId: string, @Body() dto: UpdateStaffDocumentDto, @CurrentUser() user: AuthUser) {
    return this.docsService.update(docId, id, dto, user);
  }

  @Delete(':docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.HR_STAFF_UPDATE)
  remove(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: AuthUser) {
    return this.docsService.remove(docId, id, user);
  }
}
