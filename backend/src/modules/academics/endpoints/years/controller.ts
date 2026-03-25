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
import { YearsService } from './service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/years')
export class YearsController {
  constructor(private readonly yearsService: YearsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ACADEMICS_YEAR_MANAGE)
  create(@Body() dto: CreateAcademicYearDto, @CurrentUser() user: AuthUser) {
    return this.yearsService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  findAll(@CurrentSchool() schoolId: string) {
    return this.yearsService.findAll(schoolId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_CLASS_READ)
  findOne(@Param('id') id: string, @CurrentSchool() schoolId: string) {
    return this.yearsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACADEMICS_YEAR_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto, @CurrentUser() user: AuthUser) {
    return this.yearsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ACADEMICS_YEAR_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.yearsService.remove(id, user);
  }

  @Post(':id/set-current')
  @RequirePermissions(PERMISSIONS.ACADEMICS_YEAR_MANAGE)
  setCurrent(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.yearsService.setCurrent(id, user);
  }
}
