# Inventory System Design (Production-Grade)

## 1. Recommended Data Model

### Core tables

- **Product** (existing)  
  - Add: `stockQuantity Int @default(0)` — current sellable quantity (physical stock minus nothing; we deduct at order creation).  
  - Invariant: `stockQuantity >= 0` always.

- **InventoryMovement** (new)  
  - Audit log of every change to stock.  
  - Fields: `id`, `productId`, `orderId?`, `type` (enum: `SALE` | `RESTORE` | `ADJUSTMENT`), `quantityDelta` (signed: negative = out, positive = in), `reference` (e.g. "Order #x", "Admin adjust"), `createdAt`.  
  - Enables: audit trail, debugging, and recomputing stock from movements if needed.

- **IdempotencyKey** (new)  
  - For order creation (and later payment webhooks).  
  - Fields: `id` (UUID or hash of key), `key` (unique, client-provided), `orderId?`, `responseSnapshot?` (JSON), `createdAt`, `expiresAt`.  
  - Prevents double-deduct on retries and duplicate webhooks.

### Optional: variants

- If you add size/colour variants later: introduce **ProductVariant** (productId, sku, size, etc.) with its own `stockQuantity`, and **OrderItem** points to variantId instead of (or in addition to) productId. Same rules below apply per variant.

---

## 2. When to Reserve vs Permanently Deduct

- **Reserve** = hold stock for a limited time (e.g. 15 min) before payment; then either **capture** (convert to sale) or **release** (return to stock).  
- **Deduct** = permanently reduce sellable stock (e.g. at order creation or at payment confirmation).

Recommended for your flow (COD + bank deposit, no real-time gateway):

- **Deduct on order creation**  
  - When an order is successfully created, reduce `Product.stockQuantity` by the order quantities in one atomic transaction.  
  - No separate “reserve” step: order creation = commitment.  
  - **Restore on cancellation**: when order status becomes `CANCELLED`, increase `stockQuantity` by the order quantities (once per order, idempotent).

If you later add a payment gateway with “authorize then capture”:

- You can introduce a **Reservation** table (orderId, productId, quantity, expiresAt) and a background job that releases expired reservations. On payment success: delete reservations and deduct from `stockQuantity` (or move reservation to “captured” and treat as deduct). Design doc can be extended then.

---

## 3. Safe Concurrency Strategy

- **Single source of truth**: stock is only changed in the database, inside transactions.  
- **Atomic updates**: use one transaction per order creation that:
  1. Locks or updates product rows so that `stock_quantity` is decremented only if it stays ≥ 0.  
  2. Inserts Order, OrderItems, and InventoryMovement rows.  
  3. Commits; or rolls back on any failure (constraint, insufficient stock, etc.).

Ways to implement “decrement only if enough”:

- **Option A (recommended): atomic UPDATE**  
  - For each product in the order:  
    `UPDATE product SET stock_quantity = stock_quantity - :qty WHERE id = :id AND stock_quantity >= :qty`  
  - If any UPDATE affects 0 rows → rollback and return “Insufficient stock for product X”.  
  - No explicit row lock needed if this is the only writer to stock; serializable or read-committed is enough.

- **Option B: SELECT FOR UPDATE then check and UPDATE**  
  - In a transaction: `SELECT ... FROM product WHERE id IN (...) FOR UPDATE`, then in app check `stockQuantity >= requested`, then `UPDATE product SET stock_quantity = ...`.  
  - Use if you have other logic that must run between “read” and “write” in the same transaction.

- **Option C: optimistic locking**  
  - Add `version` to Product; read product, check quantity, then `UPDATE ... SET stock_quantity = ..., version = version + 1 WHERE id = :id AND version = :version`.  
  - If 0 rows updated, retry or return conflict. Prefer Option A for simplicity unless you need versioning for other reasons.

Recommendation: **Option A** in a single transaction with order + order_items + inventory_movements. No reliance on application-level locks or single-threaded execution.

---

## 4. Retries, Rollbacks, Duplicate Events

### Idempotency for order creation

- Client sends `Idempotency-Key: <unique-key>` (e.g. UUID) on `POST /orders/checkout` via HTTP header **`Idempotency-Key`** (implementation: checkout endpoint reads this header and passes it to the orders service).  
- Server:
  1. Before doing any stock or order work: look up `IdempotencyKey` by key.  
  2. If found and already has `orderId`: return the existing order response (same body as original create); **do not deduct again**.  
  3. If not found (or key expired): proceed with create; in the same transaction as order insert, insert `IdempotencyKey` with `key`, `orderId`, and optionally a snapshot of the response.  
  4. Key expiry: e.g. 24 hours; after that a new order with the same key can be treated as new (or reject duplicate keys forever—your policy).

Result: retries (network/timeout) and duplicate submissions do not double-deduct.

### Rollbacks

- Any failure inside the create-order transaction (insufficient stock, DB error, constraint) causes a full rollback: no order, no deduct, no idempotency row.  
- On rollback, return a clear error (e.g. 400 “Insufficient stock”) so the client can show the user and not retry the same request blindly.

### Duplicate events (e.g. webhooks)

- For payment webhooks (when you add them): use the same idea.  
  - Webhook payload should have a unique `event_id` or `payment_intent_id`.  
  - Before applying “payment succeeded” (e.g. confirm order / deduct if you were reserving): check if that event_id was already processed; if yes, return 200 and do nothing.  
  - Store processed event IDs in a table with unique constraint so duplicates are rejected at DB level.

### Restore on cancel

- When transitioning order to `CANCELLED`, restore stock in a **separate transaction** (or in the same transaction as the status update).  
- Ensure restore is **idempotent**: only restore if this order had previously deducted. Options:  
  - Track “inventory already restored” on the order (e.g. `order.inventoryRestoredAt`), or  
  - Only allow one transition to CANCELLED and restore exactly once when that happens.  
- Do not restore again if the same order is “cancelled” twice (e.g. duplicate webhook or admin click); use a flag or idempotency.

---

## 5. Invariants That Must Always Hold

1. **Non-negative stock**  
   - For every product: `stockQuantity >= 0`. Enforce with a DB check constraint if possible; otherwise enforce in the only code paths that write to `stockQuantity` (order create, cancel, adjustment).

2. **No oversell**  
   - Order creation only commits if every line item has `product.stockQuantity >= requested quantity` at commit time (achieved by atomic UPDATE with `WHERE stock_quantity >= :qty`).

3. **Conservation**  
   - Sum of `InventoryMovement.quantityDelta` for a product equals the current `Product.stockQuantity` minus the initial stock at go-live (or since last reconciliation). Optional: a periodic job that recomputes from movements and alerts on mismatch.

4. **Single deduct per order**  
   - Each successful order creation deducts exactly once per product (enforced by doing it in one transaction and by idempotency key).

5. **Single restore per order**  
   - When an order is cancelled, stock is restored at most once (enforced by a “restored” flag or by only restoring when transitioning to CANCELLED and not running that path again).

---

## 6. Common Production Bugs and How This Design Avoids Them

| Bug | Cause | Mitigation |
|-----|--------|------------|
| Overselling | Race: two requests read “5 in stock”, both sell 5. | Atomic UPDATE with `WHERE stock_quantity >= qty`; only one commit wins. |
| Negative stock | No check on decrement. | Same atomic UPDATE; app never sets negative; optional CHECK constraint. |
| Double deduct on retry | Client retries POST /orders; server creates two orders. | Idempotency key: second request returns first order and does not deduct again. |
| Double restore on cancel | Cancel webhook or button fired twice. | Restore only once per order (flag or single transition to CANCELLED). |
| Stock and order out of sync | Order created but deduct failed (or vice versa). | Single transaction: order + items + deduct + movements; all or nothing. |
| Lost updates | Two admins adjust stock at same time. | Serialize adjustments (transaction + atomic UPDATE or SELECT FOR UPDATE). |
| No audit trail | Can’t explain why stock changed. | InventoryMovement for every change; type, reference, timestamp. |
| Silent failures | Errors swallowed, stock wrong. | No swallow: throw on failure, rollback transaction; log and optionally alert on low stock or movement failures. |

---

## 7. Observability

- **Logging**: Log every deduct/restore/adjustment with productId, orderId (if any), quantity delta, and outcome (success/failure). Log idempotency hits (duplicate key) at info level.
- **Metrics**: Count of deduct/restore/adjust by type; gauge of current stock per product (or per variant); alert when stock &lt; threshold or when movement fails.
- **Alerts**: Failures in order creation due to insufficient stock; constraint violations on inventory tables; reconciliation job failure if you add one.

---

## 8. Summary

- **Model**: Product.stockQuantity; InventoryMovement for audit; IdempotencyKey for order create (and future webhooks).  
- **Rules**: Deduct on order create (atomic); restore on cancel (once, idempotent); admin adjustments via a dedicated, atomic path.  
- **Concurrency**: Atomic UPDATE with `stock_quantity >= qty` in a single transaction with order creation; no reliance on app-level locks.  
- **Retries / duplicates**: Idempotency key for order create; single-restore per order for cancel; future webhooks: dedupe by event_id.  
- **Invariants**: Non-negative stock, no oversell, conservation (movements sum = current stock delta), single deduct/restore per order.

This keeps inventory correct and consistent under concurrency, retries, and partial failures, and makes it observable and auditable.
