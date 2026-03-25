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
import { ClassesService } from './service';
import { CreateClassDto, UpdateClassDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_MANAGE)
  create(@Body() dto: CreateClassDto, @CurrentUser() user: AuthUser) {
    return this.classesService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_MANAGE)
  findAll(@CurrentSchool() schoolId: string) {
    return this.classesService.findAll(schoolId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_MANAGE)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.classesService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto, @CurrentUser() user: AuthUser) {
    return this.classesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.classesService.remove(id, user);
  }
}
