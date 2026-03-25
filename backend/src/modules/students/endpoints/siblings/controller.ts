import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SiblingsService } from './service';
import { LinkSiblingDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students/:id/siblings')
export class SiblingsController {
  constructor(private readonly siblingsService: SiblingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_READ)
  findAll(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.siblingsService.findAll(id, schoolId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  link(@Param('id') id: string, @Body() dto: LinkSiblingDto, @CurrentUser() user: AuthUser) {
    return this.siblingsService.link(id, dto, user);
  }

  @Delete(':siblingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_UPDATE)
  unlink(@Param('id') id: string, @Param('siblingId') siblingId: string, @CurrentUser() user: AuthUser) {
    return this.siblingsService.unlink(id, siblingId, user);
  }
}
