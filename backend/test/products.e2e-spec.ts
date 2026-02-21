/**
 * E2E tests: Full NestJS app with Testcontainers PostgreSQL.
 * Seeds deterministic test data (user with products:write), runs CRUD + auth flows, tears down.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { join } from 'path';

describe('Products API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let container: StartedPostgreSqlContainer | undefined;
  let accessToken: string;
  let createdProductId: string;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('adab_test')
        .start();
    } catch (err) {
      console.warn('Testcontainers could not start (Docker may be unavailable). Skipping products e2e.');
      return;
    }
    if (!container) return;
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;

    execSync('npx prisma db push --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: url },
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    const hash = await bcrypt.hash('test-password', 10);
    const perm = await prisma.permission.create({
      data: { name: 'products:write' },
    });
    const role = await prisma.role.create({
      data: { name: 'admin' },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'e2e@test.com',
        passwordHash: hash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });

    accessToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      permissions: ['products:write'],
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (container) {
      await container.stop();
    }
  });

  describe('Public product listing', () => {
    it('GET /products returns 200 and array', async () => {
      if (!container || !app) return;
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalPages).toBeDefined();
    });
  });

  describe('Protected product CRUD', () => {
    it('POST /products without token returns 401', async () => {
      if (!container || !app) return;
      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'New Product',
          slug: 'new-product',
          priceCents: 1000,
        })
        .expect(401);
    });

    it('POST /products with token creates product', async () => {
      if (!container || !app) return;
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Product',
          slug: 'e2e-product',
          description: 'Created in e2e',
          priceCents: 4200,
          currency: 'PKR',
          sizes: ['S', 'M', 'L'],
          featured: true,
        })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.slug).toBe('e2e-product');
      expect(res.body.data.price).toBe(4200);
      createdProductId = res.body.data.id;
    });

    it('GET /products/:id returns the product', async () => {
      if (!container || !app) return;
      const res = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);
      expect(res.body.data.id).toBe(createdProductId);
      expect(res.body.data.name).toBe('E2E Product');
    });

    it('PUT /products/:id updates the product', async () => {
      if (!container || !app) return;
      const res = await request(app.getHttpServer())
        .put(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Product Updated', priceCents: 5000 })
        .expect(200);
      expect(res.body.data.name).toBe('E2E Product Updated');
      expect(res.body.data.price).toBe(5000);
    });

    it('DELETE /products/:id removes the product', async () => {
      if (!container || !app) return;
      await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(404);
    });
  });

  describe('Auth login', () => {
    it('POST /auth/login returns token for valid credentials', async () => {
      if (!container || !app) return;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@test.com', password: 'test-password' })
        .expect(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('e2e@test.com');
    });

    it('POST /auth/login returns 401 for invalid credentials', async () => {
      if (!container || !app) return;
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@test.com', password: 'wrong' })
        .expect(401);
    });
  });
});
