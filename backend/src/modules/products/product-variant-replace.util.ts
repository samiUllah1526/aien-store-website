import { BadRequestException } from '@nestjs/common';
import { ProductVariantInputDto } from './dto/product-variant-input.dto';

/**
 * Stable key for (color, size) matching across DB rows and incoming payloads.
 * Lowercase + trim keeps comparisons consistent with unique @@unique([productId, color, size]).
 */
export function variantCompositeKey(color: string, size: string): string {
  return `${color.toLowerCase().trim()}__${size.toLowerCase().trim()}`;
}

export type NormalizedVariantInput = {
  id?: string;
  color: string;
  size: string;
  sku: string | null;
  stockQuantity: number;
  priceOverrideCents: number | null;
  isActive: boolean;
  mediaIds?: string[];
};

export type ExistingVariantRow = {
  id: string;
  color: string;
  size: string;
};

export type VariantDiffResult = {
  /** Keys present only in incoming — create new rows. */
  toCreate: NormalizedVariantInput[];
  /** Same (color, size) in DB and payload — update by primary key. */
  toUpdate: Array<{ id: string; input: NormalizedVariantInput }>;
  /** Keys dropped from payload — delete when FK allows, else soft-archive. */
  toRemoveIds: string[];
};

/**
 * Validates, trims, deduplicates by composite key, and normalizes numeric fields.
 *
 * @param allowEmpty - When true (product update / full replace), `[]` clears all variants.
 */
export function normalizeVariantInputsForReplace(
  input: ProductVariantInputDto[] | undefined,
  allowEmpty: boolean,
): NormalizedVariantInput[] {
  if (!input?.length) {
    if (allowEmpty) return [];
    throw new BadRequestException('At least one variant is required');
  }
  const keys = new Set<string>();
  return input.map((variant, idx) => {
    const color = variant.color?.trim();
    const size = variant.size?.trim();
    if (!color || !size) {
      throw new BadRequestException(
        `Variant #${idx + 1} must include color and size`,
      );
    }
    const key = variantCompositeKey(color, size);
    if (keys.has(key)) {
      throw new BadRequestException(
        `Duplicate variant combination: ${color} / ${size}`,
      );
    }
    keys.add(key);
    return {
      ...(variant.id ? { id: variant.id } : {}),
      color,
      size,
      sku: variant.sku?.trim() ? variant.sku.trim() : null,
      stockQuantity: Math.max(0, variant.stockQuantity ?? 0),
      priceOverrideCents:
        variant.priceOverrideCents != null
          ? Math.max(0, variant.priceOverrideCents)
          : null,
      isActive: variant.isActive ?? true,
      mediaIds: variant.mediaIds,
    };
  });
}

/**
 * Computes create / update / remove sets from existing DB rows vs full replacement payload.
 * Matching is strictly by composite key (color + size), not by client-supplied id alone.
 */
export function diffProductVariants(
  existing: ExistingVariantRow[],
  incoming: NormalizedVariantInput[],
): VariantDiffResult {
  const existingByKey = new Map<string, ExistingVariantRow>();
  for (const row of existing) {
    existingByKey.set(variantCompositeKey(row.color, row.size), row);
  }

  const incomingByKey = new Map<string, NormalizedVariantInput>();
  for (const row of incoming) {
    incomingByKey.set(variantCompositeKey(row.color, row.size), row);
  }

  const toCreate: NormalizedVariantInput[] = [];
  const toUpdate: Array<{ id: string; input: NormalizedVariantInput }> = [];

  for (const [key, input] of incomingByKey) {
    const ex = existingByKey.get(key);
    if (!ex) {
      if (input.id) {
        throw new BadRequestException(
          `Unexpected id for new variant (unknown key "${key}")`,
        );
      }
      toCreate.push(input);
      continue;
    }
    if (input.id !== undefined && input.id !== ex.id) {
      throw new BadRequestException(
        `Variant id does not match existing row for ${input.color} / ${input.size}`,
      );
    }
    toUpdate.push({ id: ex.id, input });
  }

  const toRemoveIds: string[] = [];
  for (const [key, ex] of existingByKey) {
    if (!incomingByKey.has(key)) {
      toRemoveIds.push(ex.id);
    }
  }

  return { toCreate, toUpdate, toRemoveIds };
}

/**
 * Non-null SKUs must be unique within the replacement payload so we never hit the global
 * sku unique index when applying creates/updates in one transaction.
 */
export function assertUniqueSkusAmongIncoming(
  variants: NormalizedVariantInput[],
): void {
  const seen = new Set<string>();
  for (const v of variants) {
    if (v.sku == null) continue;
    if (seen.has(v.sku)) {
      throw new BadRequestException(`Duplicate SKU in request: ${v.sku}`);
    }
    seen.add(v.sku);
  }
}
