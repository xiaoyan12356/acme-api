/**
 * /api/health 公开探活接口（@Public，不鉴权）
 */

import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('api/health')
export class HealthController {
  @Public()
  @Get()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}