import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * HealthController — simple liveness probe.
 *
 * Why @Public(): load balancers and monitoring tools need to call this
 * endpoint without a JWT token. It returns no sensitive data.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe — returns 200 if the server is up' })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      example: {
        success: true,
        data: { status: 'ok', timestamp: '2026-08-03T05:00:00.000Z' },
        message: 'OK',
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
