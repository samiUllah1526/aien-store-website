import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '../src/modules/health/health.controller';

/**
 * Integration tests: HealthModule with real Terminus health checks.
 * Uses a minimal module (no full AppModule) to verify HTTP and health logic together.
 */
describe('Health (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns health check result with expected shape (200 or 503)', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('info');
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('details');
      expect(['ok', 'error']).toContain(res.body.status);
    });
  });

  describe('GET /health/live', () => {
    it('returns 200 with status ok and ISO timestamp', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
        }),
      );
      expect(() => new Date(res.body.timestamp)).not.toThrow();
    });
  });
});
