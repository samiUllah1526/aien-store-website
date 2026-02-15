# Inventory Management (Admin) — Design

Dedicated admin tooling for inventory: safe, auditable, and clear. Correctness and clarity over speed.

---

## 1. Data Model (Current + Extensions)

### Current

- **Product.stockQuantity** (Int, ≥ 0): sellable quantity. Single source of truth; no separate “reserved” in the current flow (stock is deducted at order creation, restored on cancel).
- **InventoryMovement**: audit row per change — `productId`, `orderId?`, `type` (SALE | RESTORE | ADJUSTMENT), `quantityDelta` (signed), `reference?`, `createdAt`. Indexes on `productId`, `orderId`.

### For Admin Audit (“who”)

- **InventoryMovement.performedByUserId** (optional UUID, FK to User): set for ADJUSTMENT when an admin performs the change. Enables “who changed stock, when, and why.”

### Available vs reserved vs total

- **Available** = `Product.stockQuantity` (what can be sold / allocated).
- **Reserved**: in the current design there is no reservation table; orders deduct at creation. So **reserved = 0** in the UI. If you later add “reserve on add-to-cart, capture on payment,” you would add a `Reservation` table and then: **total = available + reserved**, **available** = what’s left for new orders.
- **Total** (for display): today total = available. With reservations: total = available + reserved.

UI can show “Available (sellable): X”, “Reserved: 0 (not used)”, and “Total: X” so the model is clear and ready for future reservation.

---

## 2. Admin Inventory Page — Layout and UX

### Purpose

- Single place to see stock levels and perform adjustments.
- No mixing with product editing (product form stays for catalog; inventory page is for stock only).

### Layout

- **Header**: “Inventory” title, optional filters (e.g. “Low stock only”, “Out of stock”), sort (e.g. by stock ascending to see critical first).
- **Table** (or card list): one row per product — name, SKU/slug, **available stock**, status badge (In stock / Low stock / Out of stock), last movement date (optional), **Actions** (Adjust stock, View history).
- **Adjust stock**: modal or slide-over — current stock, change amount (+/-), required reason, “Update” with loading state. **Confirmation** when change is negative (e.g. “You are reducing stock by X. This cannot be undone. Continue?”).
- **View history**: modal or expandable section — list of movements (type, delta, reference, date, performed by) for that product.

### UX flow

1. Admin opens **Inventory** from sidebar.
2. Sees list of products with stock and status; can filter/sort.
3. Clicks **Adjust** on a product → modal opens with current stock, quantity delta, reason.
4. For **decrease**: confirm step (e.g. “Reduce by 5? Confirm.”) then submit.
5. Server validates (no negative result); on success, table updates and optional success message.
6. **View history** shows who changed what, when, and why (from `InventoryMovement` + `performedByUserId`).

### Safeguards in the UI

- **No negative stock**: backend rejects; frontend can pre-check and show “Result would be negative” and disable submit or show confirmation with warning.
- **Required reason**: reason field required for every adjustment (audit).
- **Confirmation for destructive action**: explicit confirm when decreasing stock.
- **Inline validation**: e.g. “Change amount must not be zero”, “Reason is required”.
- **Clear errors**: display server error (e.g. “Cannot reduce: only 3 in stock”) so the admin can correct.

---

## 3. Backend APIs for Inventory

### Existing (keep)

- **PATCH /products/:id/stock**  
  Body: `{ quantityDelta, reference? }`. Auth: `products:write`. Atomic adjust; creates ADJUSTMENT movement. Optionally store `performedByUserId` from request when present.

### Add

- **GET /inventory/products**  
  Returns products with stock fields (e.g. `id`, `name`, `slug`, `stockQuantity`, `inStock`). Query: `page`, `limit`, `search`, `filter=low_stock|out_of_stock|all`. Sort: e.g. `sortBy=stockQuantity`, `sortOrder=asc` to surface low/out first. Reuse product list with inventory-specific defaults or a thin inventory-specific handler.

- **GET /inventory/products/:productId/movements**  
  Paginated list of `InventoryMovement` for that product (order by `createdAt` desc). Response: `{ data: Movement[], total }`. Fields: `id`, `type`, `quantityDelta`, `reference`, `createdAt`, `performedByUserId` (or user name if joined). Auth: e.g. `products:read` or `inventory:read`.

All inventory **writes** go through the same `InventoryService.adjust` (or deduct/restore) so they remain transactional and concurrency-safe.

---

## 4. Race Conditions and Concurrent Updates

- **Single source of truth**: only the backend changes `stock_quantity`; all changes go through `InventoryService`.
- **Atomic updates**:  
  - **Decrease**: `UPDATE products SET stock_quantity = stock_quantity + :delta WHERE id = :id AND stock_quantity + :delta >= 0`. If 0 rows updated → 400 “Insufficient stock.”  
  - **Increase**: `increment` or equivalent so no race.
- **Transactions**: adjust runs in a transaction (or single atomic statement); movement row is written after the update so we never have a movement without the corresponding stock change.
- **No “read–then–write” in app**: avoid “read stock, check in app, then update”; use conditional UPDATE so the DB enforces non-negative stock under concurrency.

Admin UI can show “current stock” that might be stale; the moment they submit, the server re-checks. If another request reduced stock in the meantime, the server returns an error and the UI shows it; admin can refresh and retry.

---

## 5. Safeguards Against Accidental Stock Corruption

| Risk | Mitigation |
|------|------------|
| Negative stock | Atomic UPDATE with `WHERE stock_quantity + delta >= 0`; reject with clear error. |
| Double apply | Idempotency for order creation (existing). For admin adjust: one request = one movement; no idempotency key required if no double-submit (UI can disable button after submit). |
| Wrong product | UI shows product name in modal; backend uses productId from URL/body. |
| No audit | Every change is an `InventoryMovement` with type, delta, reference, timestamp; optional `performedByUserId` for “who.” |
| Accidental large decrease | Confirmation step for negative adjustments; server rejects if result &lt; 0. |
| No reason | Require “reason” for adjustments so every change is explainable. |

---

## 6. Common Admin-Side Mistakes and How the UI Prevents Them

| Mistake | Prevention |
|--------|------------|
| Reducing stock below zero | Backend atomic check; UI can show “After change: X” and disable or warn when X &lt; 0. |
| Forgetting why stock was changed | Required “reason” field; shown in history. |
| Adjusting the wrong product | Modal title/description shows product name; history is per product. |
| Double-click / double submit | Disable submit button while request in flight; optional idempotency key for critical flows. |
| Confusing “add” vs “remove” | Explicit labels: “Change amount (positive = add, negative = remove)” and preview “After change: X.” |
| No visibility into past changes | “View history” with type, delta, reference, date, and (if stored) who. |

---

## 7. Inventory and Checkout

- Checkout uses the same `Product.stockQuantity` and deducts only at order creation (atomic).
- Inventory adjustments and order flows both go through the same `InventoryService` / atomic UPDATEs, so **inventory changes immediately affect checkout availability** with no extra step (no cache to invalidate if pricing/availability is read from DB at quote and order creation).

This design keeps the inventory management page focused, safe, and auditable while staying consistent with the existing inventory and checkout implementation.
