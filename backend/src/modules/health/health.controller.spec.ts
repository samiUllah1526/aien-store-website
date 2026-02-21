import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;

  const mockHealthResult = {
    status: 'ok' as const,
    info: {},
    error: {},
    details: {},
  };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockResolvedValue(mockHealthResult),
    } as unknown as jest.Mocked<HealthCheckService>;

    memoryHealthIndicator = {
      checkHeap: jest.fn(),
    } as unknown as jest.Mocked<MemoryHealthIndicator>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        {
          provide: MemoryHealthIndicator,
          useValue: memoryHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('returns health check result', async () => {
      const result = await controller.check();
      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
      expect(memoryHealthIndicator.checkHeap).not.toHaveBeenCalled();
    });

    it('runs memory heap check with 300MB threshold', async () => {
      await controller.check();
      const indicators = healthCheckService.check.mock.calls[0][0];
      expect(Array.isArray(indicators)).toBe(true);
      const heapIndicator = indicators[0];
      expect(typeof heapIndicator).toBe('function');
      await heapIndicator();
      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        300 * 1024 * 1024,
      );
    });
  });

  describe('liveness', () => {
    it('returns status ok and ISO timestamp', () => {
      const before = new Date().toISOString();
      const result = controller.liveness();
      const after = new Date().toISOString();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
        }),
      );
      const ts = new Date(result.timestamp).getTime();
      expect(ts).toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(ts).toBeLessThanOrEqual(new Date(after).getTime() + 1000);
    });
  });
});
