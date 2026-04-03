import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { getPublicPrismaErrorResponse } from './prisma-public-error';

describe('getPublicPrismaErrorResponse', () => {
  it('maps P2002 with sku target to friendly SKU message', () => {
    const err = new PrismaClientKnownRequestError('internal', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['sku'] },
    });
    const out = getPublicPrismaErrorResponse(err);
    expect(out?.status).toBe(409);
    expect(out?.message).toContain('SKU');
  });

  it('maps P2002 with color/size hint to variant message', () => {
    const err = new PrismaClientKnownRequestError('internal', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['product_id', 'color', 'size'] },
    });
    const out = getPublicPrismaErrorResponse(err);
    expect(out?.message).toContain('color and size');
  });

  it('returns null for non-Prisma errors', () => {
    expect(getPublicPrismaErrorResponse(new Error('secret db'))).toBeNull();
  });
});
