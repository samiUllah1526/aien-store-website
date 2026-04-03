import { BadRequestException } from '@nestjs/common';
import {
  assertUniqueSkusAmongIncoming,
  diffProductVariants,
  normalizeVariantInputsForReplace,
  variantCompositeKey,
} from './product-variant-replace.util';

describe('product-variant-replace.util', () => {
  describe('variantCompositeKey', () => {
    it('normalizes case and trim', () => {
      expect(variantCompositeKey('  Red ', ' L ')).toBe('red__l');
    });
  });

  describe('normalizeVariantInputsForReplace', () => {
    it('throws when empty and allowEmpty false', () => {
      expect(() => normalizeVariantInputsForReplace([], false)).toThrow(
        BadRequestException,
      );
    });

    it('returns [] when empty and allowEmpty true', () => {
      expect(normalizeVariantInputsForReplace([], true)).toEqual([]);
    });

    it('rejects duplicate keys in payload', () => {
      expect(() =>
        normalizeVariantInputsForReplace(
          [
            { color: 'Red', size: 'M', stockQuantity: 1 },
            { color: 'red', size: 'm', stockQuantity: 2 },
          ],
          false,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('diffProductVariants', () => {
    it('splits create, update, remove by composite key', () => {
      const existing = [
        { id: 'a', color: 'Red', size: 'M' },
        { id: 'b', color: 'Blue', size: 'L' },
      ];
      const incoming = normalizeVariantInputsForReplace(
        [
          { color: 'Red', size: 'M', stockQuantity: 3, sku: 'S1' },
          { color: 'Green', size: 'S', stockQuantity: 1 },
        ],
        false,
      );
      const diff = diffProductVariants(existing, incoming);
      expect(diff.toRemoveIds).toEqual(['b']);
      expect(diff.toUpdate).toHaveLength(1);
      expect(diff.toUpdate[0].id).toBe('a');
      expect(diff.toCreate).toHaveLength(1);
      expect(diff.toCreate[0].color).toBe('Green');
    });
  });

  describe('assertUniqueSkusAmongIncoming', () => {
    it('throws on duplicate non-null skus', () => {
      const v = normalizeVariantInputsForReplace(
        [
          { color: 'Red', size: 'M', stockQuantity: 1, sku: 'X' },
          { color: 'Blue', size: 'L', stockQuantity: 1, sku: 'X' },
        ],
        false,
      );
      expect(() => assertUniqueSkusAmongIncoming(v)).toThrow(
        BadRequestException,
      );
    });
  });
});
