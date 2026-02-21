/**
 * Integration tests: ProductsModule with real PostgreSQL.
 * Uses DATABASE_URL (or DATABASE_URL_TEST). Run migrations (db push) before first run.
 * Resets database state between tests via PrismaService.cleanDatabase().
 */
import { Test, TestingModule } from '@nestjs/testing';
import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductsModule } from '../src/modules/products/products.module';
import { ProductsService } from '../src/modules/products/products.service';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';

const testDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (!testDbUrl) {
  console.warn('DATABASE_URL or DATABASE_URL_TEST not set; skipping products integration tests.');
}

describe('Products (integration)', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    if (!testDbUrl) return;
    process.env.DATABASE_URL = testDbUrl;
    try {
      execSync('npx prisma db push --accept-data-loss', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
      });
    } catch {
      // db push may fail if no schema changes; continue
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ProductsModule],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    if (!testDbUrl || !prisma) return;
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('should create and then find a product', async () => {
    if (!testDbUrl) return;
    const dto: CreateProductDto = {
      name: 'Integration Product',
      slug: 'integration-product',
      description: 'Test',
      priceCents: 3500,
      currency: 'PKR',
      sizes: ['S', 'M', 'L'],
      featured: true,
    };
    const created = await service.create(dto);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(dto.name);
    expect(created.slug).toBe(dto.slug);
    expect(created.price).toBe(3500);
    expect(created.sizes).toEqual(['S', 'M', 'L']);
    expect(created.featured).toBe(true);

    const found = await service.findOne(created.id);
    expect(found.name).toBe(created.name);
    expect(found.slug).toBe(created.slug);
  });

  it('should list products with pagination', async () => {
    if (!testDbUrl) return;
    await service.create({
      name: 'First',
      slug: 'first',
      priceCents: 1000,
    });
    await service.create({
      name: 'Second',
      slug: 'second',
      priceCents: 2000,
    });
    const { data, total } = await service.findAll({ page: 1, limit: 10 });
    expect(total).toBe(2);
    expect(data).toHaveLength(2);
  });

  it('should update and delete product', async () => {
    if (!testDbUrl) return;
    const created = await service.create({
      name: 'To Update',
      slug: 'to-update',
      priceCents: 1000,
    });
    const updated = await service.update(created.id, {
      name: 'Updated',
      priceCents: 2500,
    });
    expect(updated.name).toBe('Updated');
    expect(updated.price).toBe(2500);

    await service.remove(created.id);
    await expect(service.findOne(created.id)).rejects.toThrow();
  });
});
