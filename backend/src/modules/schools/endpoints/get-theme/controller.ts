import { Controller, Get } from '@nestjs/common';
import { SchoolsService } from '../../schools.service';
import { CurrentSchool } from '../../../../common/decorators/current-school.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import type { SchoolThemeResponse } from '@schoolos/types';

@Controller('school')
export class GetThemeController {
  constructor(private readonly schoolsService: SchoolsService) {}

  /**
   * GET /v1/school/theme
   * Returns the CSS theme variables for the current school.
   * Public — no authentication required.
   * See route.md for full specification.
   */
  @Get('theme')
  @Public()
  async getTheme(
    @CurrentSchool() schoolId: string,
  ): Promise<SchoolThemeResponse> {
    return this.schoolsService.getTheme(schoolId);
  }
}
