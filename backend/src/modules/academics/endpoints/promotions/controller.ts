import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, Headers, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PromotionsService, PROMOTION_QUEUE } from './service';
import { BulkPromoteDto } from './dto/request.dto';
import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@schoolos/config';
import type { AuthUser } from '@schoolos/types';

@Controller('academics/promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    @InjectQueue(PROMOTION_QUEUE) private readonly promotionQueue: Queue,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(PERMISSIONS.ACADEMICS_PROMOTION_MANAGE)
  bulkPromote(
    @Body() dto: BulkPromoteDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required.' },
      });
    }
    return this.promotionsService.bulkPromote(dto, user, idempotencyKey);
  }

  @Get('jobs/:jobId')
  @RequirePermissions(PERMISSIONS.ACADEMICS_PROMOTION_MANAGE)
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.promotionQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Promotion job not found.' } });
    }
    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue as Record<string, unknown> | undefined;
    return {
      job_id: job.id,
      status: state,
      progress,
      total: (job.data as { promotions: unknown[] }).promotions?.length ?? 0,
      result: result ?? null,
    };
  }
}
