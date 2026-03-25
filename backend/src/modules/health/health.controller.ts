import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

interface HealthResponse {
  status: string;
  version: string;
}

@Controller('healthz')
export class HealthController {
  /**
   * GET /v1/healthz
   *
   * Public health check endpoint. Returns a standard API envelope:
   *   { "data": { "status": "ok", "version": "1.0.0" } }
   *
   * The ResponseTransformInterceptor wraps this in { data: ... }.
   */
  @Get()
  @Public()
  check(): HealthResponse {
    return {
      status: 'ok',
      version: '1.0.0',
    };
  }
}
