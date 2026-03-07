import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check (memory)', security: [] })
  check() {
    const heapLimitBytes =
      this.configService.get<number>('health.heapLimitBytes') ??
      300 * 1024 * 1024;
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', heapLimitBytes),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe', security: [] })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
