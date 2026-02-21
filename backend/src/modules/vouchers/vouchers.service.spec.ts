import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherAuditService } from './voucher-audit.service';
import { VouchersService, VOUCHER_ERROR_CODES } from './vouchers.service';

const voucherId = '11111111-1111-1111-1111-111111111111';
const productId = '22222222-2222-2222-2222-222222222222';

const now = new Date();
const past = new Date(now.getTime() - 86400000);
const future = new Date(now.getTime() + 86400000);

const baseVoucher = {
  id: voucherId,
  code: 'SAVE10',
  type: 'PERCENTAGE',
  value: 10,
  minOrderValueCents: 0,
  maxDiscountCents: null,
  startDate: past,
  expiryDate: future,
  usageLimitGlobal: null,
  usageLimitPerUser: null,
  usedCount: 0,
  applicableProductIds: null,
  applicableCategoryIds: null,
  isActive: true,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
};

describe('VouchersService', () => {
  let service: VouchersService;
  let prisma: {
    voucher: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    product: { findMany: jest.Mock };
    siteSetting: { findUnique: jest.Mock };
    voucherRedemption: { count: jest.Mock };
    voucherAuditLog: { findMany: jest.Mock; count: jest.Mock };
  };
  let audit: { publish: jest.Mock; publishAsync: jest.Mock };

  const validValidateMocks = () => {
    prisma.voucher.findFirst.mockResolvedValue(baseVoucher);
    prisma.product.findMany.mockResolvedValue([
      { id: productId, priceCents: 1000, productCategories: [] },
    ]);
    prisma.siteSetting.findUnique.mockResolvedValue({ value: { deliveryChargesCents: 200 } });
    prisma.voucherRedemption.count.mockResolvedValue(0);
  };

  beforeEach(async () => {
    prisma = {
      voucher: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: { findMany: jest.fn() },
      siteSetting: { findUnique: jest.fn() },
      voucherRedemption: { count: jest.fn() },
      voucherAuditLog: { findMany: jest.fn(), count: jest.fn() },
    };
    audit = { publish: jest.fn().mockResolvedValue(undefined), publishAsync: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        { provide: PrismaService, useValue: prisma },
        { provide: VoucherAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
  });

  describe('validate', () => {
    const items = [{ productId, quantity: 1 }];

    it('returns error when code is empty', async () => {
      const result = await service.validate({ code: '  ', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.NOT_FOUND);
      expect(prisma.voucher.findFirst).not.toHaveBeenCalled();
    });

    it('returns error when voucher not found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      const result = await service.validate({ code: 'INVALID', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.NOT_FOUND);
    });

    it('returns error when voucher expired', async () => {
      prisma.voucher.findFirst.mockResolvedValue({ ...baseVoucher, expiryDate: past });

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.EXPIRED);
    });

    it('returns error when voucher not yet started', async () => {
      prisma.voucher.findFirst.mockResolvedValue({ ...baseVoucher, startDate: future });
      prisma.product.findMany.mockResolvedValue([{ id: productId, priceCents: 1000, productCategories: [] }]);

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.NOT_STARTED);
    });

    it('returns error when voucher inactive', async () => {
      prisma.voucher.findFirst.mockResolvedValue({ ...baseVoucher, isActive: false });
      prisma.product.findMany.mockResolvedValue([{ id: productId, priceCents: 1000, productCategories: [] }]);

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.INACTIVE);
    });

    it('returns error when usage limit reached', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        ...baseVoucher,
        usageLimitGlobal: 5,
        usedCount: 5,
      });
      prisma.product.findMany.mockResolvedValue([{ id: productId, priceCents: 1000, productCategories: [] }]);

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.USAGE_LIMIT_REACHED);
    });

    it('returns error when user limit reached', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        ...baseVoucher,
        usageLimitPerUser: 1,
      });
      prisma.voucherRedemption.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([{ id: productId, priceCents: 1000, productCategories: [] }]);

      const result = await service.validate({
        code: 'SAVE10',
        items,
        customerUserId: 'user-1',
      });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.USER_LIMIT_REACHED);
    });

    it('returns error when min order not met', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        ...baseVoucher,
        minOrderValueCents: 5000,
      });
      prisma.product.findMany.mockResolvedValue([{ id: productId, priceCents: 1000, productCategories: [] }]);

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET);
    });

    it('returns valid result with percentage discount', async () => {
      validValidateMocks();

      const result = await service.validate({ code: 'save10', items });

      expect(result.valid).toBe(true);
      expect(result.voucherId).toBe(voucherId);
      expect(result.code).toBe('SAVE10');
      expect(result.discountCents).toBe(100); // 10% of 1000
      expect(result.subtotalCents).toBe(1000);
      expect(result.shippingCents).toBe(200);
      expect(result.totalCents).toBe(1100); // 1000 + 200 - 100
    });

    it('returns valid result with fixed amount discount', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        ...baseVoucher,
        type: 'FIXED_AMOUNT',
        value: 150,
      });
      prisma.product.findMany.mockResolvedValue([
        { id: productId, priceCents: 1000, productCategories: [] },
      ]);
      prisma.siteSetting.findUnique.mockResolvedValue({ value: { deliveryChargesCents: 0 } });

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(true);
      expect(result.discountCents).toBe(150);
    });

    it('returns valid result with free shipping', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        ...baseVoucher,
        type: 'FREE_SHIPPING',
        value: 0,
      });
      prisma.product.findMany.mockResolvedValue([
        { id: productId, priceCents: 1000, productCategories: [] },
      ]);
      prisma.siteSetting.findUnique.mockResolvedValue({ value: { deliveryChargesCents: 500 } });

      const result = await service.validate({ code: 'SAVE10', items });

      expect(result.valid).toBe(true);
      expect(result.discountCents).toBe(500);
    });
  });

  describe('computeDiscountForOrder', () => {
    it('returns null when code empty', async () => {
      const result = await service.computeDiscountForOrder('  ', [{ productId, quantity: 1 }]);

      expect(result).toBeNull();
    });

    it('returns null when invalid and throwOnInvalid false', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      const result = await service.computeDiscountForOrder(
        'INVALID',
        [{ productId, quantity: 1 }],
        null,
        false,
      );

      expect(result).toBeNull();
    });

    it('throws when invalid and throwOnInvalid true', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(
        service.computeDiscountForOrder('INVALID', [{ productId, quantity: 1 }], null, true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('creates voucher and returns DTO', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);
      prisma.voucher.create.mockResolvedValue({
        ...baseVoucher,
        id: 'new-id',
        code: 'NEW20',
        startDate: past,
        expiryDate: future,
      });

      const result = await service.create({
        code: 'new20',
        type: 'PERCENTAGE',
        value: 20,
        startDate: past.toISOString(),
        expiryDate: future.toISOString(),
      });

      expect(result.code).toBe('NEW20');
      expect(audit.publish).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATED', code: 'NEW20' }),
      );
    });

    it('throws ConflictException when code exists', async () => {
      prisma.voucher.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          code: 'EXISTS',
          type: 'PERCENTAGE',
          value: 10,
          startDate: past.toISOString(),
          expiryDate: future.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.voucher.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when expiry <= start', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          code: 'BAD',
          type: 'PERCENTAGE',
          value: 10,
          startDate: future.toISOString(),
          expiryDate: past.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when percentage value out of range', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          code: 'BAD',
          type: 'PERCENTAGE',
          value: 0,
          startDate: past.toISOString(),
          expiryDate: future.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when fixed amount < 1', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          code: 'BAD',
          type: 'FIXED_AMOUNT',
          value: 0,
          startDate: past.toISOString(),
          expiryDate: future.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated list with total', async () => {
      prisma.voucher.findMany.mockResolvedValue([baseVoucher]);
      prisma.voucher.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].code).toBe('SAVE10');
    });

    it('applies statusFilter active', async () => {
      prisma.voucher.findMany.mockResolvedValue([]);
      prisma.voucher.count.mockResolvedValue(0);

      await service.findAll({ statusFilter: 'active' });

      expect(prisma.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            startDate: expect.any(Object),
            expiryDate: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns voucher when found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(baseVoucher);

      const result = await service.findOne(voucherId);

      expect(result.id).toBe(voucherId);
      expect(result.code).toBe('SAVE10');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates voucher and returns DTO', async () => {
      const updated = { ...baseVoucher, code: 'UPDATED', value: 15 };
      prisma.voucher.findFirst.mockResolvedValue(baseVoucher);
      prisma.voucher.update.mockResolvedValue(updated);

      const result = await service.update(voucherId, { value: 15 });

      expect(result.value).toBe(15);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { value: 10 })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new code exists', async () => {
      prisma.voucher.findFirst
        .mockResolvedValueOnce(baseVoucher)
        .mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.update(voucherId, { code: 'TAKEN' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('updates isActive and returns DTO', async () => {
      prisma.voucher.findFirst.mockResolvedValue(baseVoucher);
      prisma.voucher.update.mockResolvedValue({ ...baseVoucher, isActive: false });

      const result = await service.updateStatus(voucherId, false);

      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus('missing', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft deletes voucher', async () => {
      prisma.voucher.findFirst.mockResolvedValue(baseVoucher);
      prisma.voucher.update.mockResolvedValue({ ...baseVoucher, deletedAt: new Date() });

      const result = await service.remove(voucherId);

      expect(result.success).toBe(true);
      expect(prisma.voucher.update).toHaveBeenCalledWith({
        where: { id: voucherId },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.voucher.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
