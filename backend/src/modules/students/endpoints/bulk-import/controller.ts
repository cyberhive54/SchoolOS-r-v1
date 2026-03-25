import {
  Controller,
  Post,
  Get,
  Headers,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { BulkImportService } from './service';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { SkipTransform } from '../../../../common/decorators/skip-transform.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('students')
export class BulkImportController {
  constructor(private readonly service: BulkImportService) {}

  @Post('bulk-import')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(PERMISSIONS.STUDENTS_BULK_IMPORT)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async startImport(
    @UploadedFile() file: Express.Multer.File,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required.' },
      });
    }
    const result = await this.service.startImport(file, idempotencyKey, user);
    return result;
  }

  @Get('bulk-import/template')
  @RequirePermissions(PERMISSIONS.STUDENTS_BULK_IMPORT)
  @SkipTransform()
  getTemplate(@Res() res: Response) {
    const csv = this.service.getTemplate();
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="students-import-template.csv"',
    });
    res.send(csv);
  }
}
