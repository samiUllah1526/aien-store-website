-- Swap-safe variant updates: PostgreSQL only allows DEFERRABLE on constraints, not on
-- CREATE UNIQUE INDEX. Replace the unique indexes with equivalent UNIQUE constraints
-- so multiple UPDATEs in one transaction (e.g. swapping size between two rows) are
-- validated at COMMIT, not after each statement.
--
-- INITIALLY DEFERRED: checks run at end of each transaction (including single-statement
-- autocommit transactions, which still commit after one statement). Multi-statement
-- transactions get one check at commit — required for swaps together with app-level
-- prisma.$transaction around variant mutations.
--
-- SKU uniqueness is similarly replaced so non-null SKU swaps are safe in one transaction.

DROP INDEX IF EXISTS "product_variants_product_id_color_size_key";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_color_size_key"
  UNIQUE ("product_id", "color", "size")
  DEFERRABLE INITIALLY DEFERRED;

DROP INDEX IF EXISTS "product_variants_sku_key";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_sku_key"
  UNIQUE ("sku")
  DEFERRABLE INITIALLY DEFERRED;
