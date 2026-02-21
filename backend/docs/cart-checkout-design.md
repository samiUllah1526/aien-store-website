# Cart & Checkout Design (Production-Grade)

Design for a manual-payment e-commerce system: **Cash on Delivery (COD)** and **Bank Transfer** (screenshot upload, admin verification). Goals: correct behaviour under concurrency, retries, and partial failures; no duplicate orders, no inventory mismatch, no incorrect totals or states.

---

## 1. Separation of Concerns: Cart vs Checkout vs Order

| Layer | Responsibility | Where it lives |
|-------|----------------|----------------|
| **Cart** | Temporary selection of products, quantities, and options (e.g. size). No pricing authority; display only. | Client (Zustand + localStorage). Optional: server-side cart for cross-device consistency. |
| **Checkout** | Collect delivery + payment method + (for bank) proof; **compute totals server-side**; **create order once**; **reserve/deduct inventory**. | Backend: quote API (read-only), checkout API (create order + inventory in one transaction). |
| **Order** | Immutable record of a placed order: items, totals, status, payment method, proof. Status changes (confirm, ship, cancel) are separate operations. | Backend: Order + OrderItem + OrderStatusHistory; payment proof = Media linked by `paymentProofMediaId`. |

**Rules**

- **Cart is not source of truth for price or availability.** Quote and order creation always use server-side product data and inventory.
- **Checkout is the only path that creates orders and deducts inventory.** No “create order then attach payment” in a way that leaves inventory deducted without a valid order.
- **Order state is changed only via defined transitions** (see state machine below). Admin actions (confirm payment, ship, cancel) go through the same transition rules.

---

## 2. Data Model

### 2.1 Cart

**Current (client-only):**

- In-memory + persisted (e.g. localStorage) store: `items[]` with `productId`, `size`, `quantity`, and display fields (`name`, `price`, `currency`, `image`).
- No backend cart table. Consistency: same browser = same storage = same cart across tabs and refreshes.

**Optional (future) server-side cart:**

- Table: `Cart` (e.g. `userId` or `sessionId`, `updatedAt`), `CartItem` (`cartId`, `productId`, `size?`, `quantity`).
- Use when you need: cross-device cart, cart expiry, or server-side “save for later”. Then: add/update/remove items via API; checkout sends `cartId` or current `items`; server re-resolves product IDs and quantities and computes quote/order from DB (still no trust of client totals).

For this design we assume **client-only cart**; checkout payload is `items: { productId, quantity }[]` plus delivery and payment fields.

### 2.2 Order (existing, summarized)

- **Order**: `id`, `status`, `totalCents`, `currency`, customer and shipping fields, `paymentMethod` (COD | BANK_DEPOSIT), `paymentProofMediaId?`, `customerUserId?`, timestamps, etc.
- **OrderItem**: `orderId`, `productId`, `quantity`, `unitCents` (stored at order creation; source of truth for what was charged).
- **OrderStatusHistory**: append-only log of status changes (audit and “status at time” semantics).

Invariants:

- Every order has at least one OrderItem.
- Totals and `unitCents` are computed and stored at creation; later price changes do not alter existing orders.

### 2.3 Inventory (existing)

- **Product.stockQuantity**: current sellable quantity; never negative.
- **InventoryMovement**: audit log (SALE, RESTORE, ADJUSTMENT); links to `orderId` where applicable.
- **IdempotencyKey**: `key` (unique), `orderId`, `expiresAt`; used so the same checkout request (same key) does not create a second order or double-deduct.

Inventory is **deducted at order creation** (no separate “reservation” window in the current flow). **Restored when order status becomes CANCELLED** (once per order, idempotent).

### 2.4 Payment proof (screenshot)

- **Storage**: File stored via Media module; path e.g. `payment-proofs/<uuid>.<ext>`.
- **Link to order**: `Order.paymentProofMediaId` → `Media.id`. One order can have at most one proof; one media record can be attached to at most one order (at creation time).
- **Lifecycle**: User uploads file → backend returns `mediaId` → user submits checkout with `paymentProofMediaId: mediaId`. No “attach proof to existing order” in the minimal flow (see below for optional “add proof later” and idempotency).

Idempotency for “upload screenshot more than once”:

- **Same checkout submission (same Idempotency-Key):** Server returns the same order; no second order, no second deduct. The same `paymentProofMediaId` is already on that order.
- **Upload same file twice:** Two different `mediaId`s; each can be used in a different checkout. Duplicate **orders** are prevented by Idempotency-Key, not by deduplicating uploads. Optionally you can add content-hash–based dedup for uploads to avoid storing the same image twice (out of scope here).

---

## 3. Checkout Flow (Safe, Idempotent)

### 3.1 COD flow

1. Client: cart in UI → user fills delivery, selects COD → submits once (with **Idempotency-Key**).
2. Server: in **one transaction**:
   - If Idempotency-Key present and already has an order → return that order; **do nothing else** (no deduct, no new order).
   - Else: validate items and payment method (COD → no proof required); compute totals from DB; create Order + OrderItems + OrderStatusHistory (PENDING); **deduct inventory** (atomic UPDATE per product); store Idempotency-Key if key provided.
3. On success: return order; client can show success and clear cart (or clear only after confirming response).
4. On failure (e.g. insufficient stock): transaction rolls back; return 400 with clear message; client does not clear cart and can show error (no retry with same key for “create new order” — key is for retries of the same intent).

### 3.2 Bank transfer flow

1. **Upload proof (before or during checkout):**
   - Client: user selects file → `POST /media/upload-payment-proof` → receives `mediaId`.
   - Server: stores file; returns `{ id: mediaId }`. No order yet; no inventory change.
2. **Submit checkout:**
   - Client: sends same payload as COD plus `paymentMethod: BANK_DEPOSIT`, `paymentProofMediaId: mediaId`, and **Idempotency-Key**.
   - Server: in **one transaction**:
     - If Idempotency-Key present and already has an order → return that order (idempotent); do not deduct again.
     - Else: validate (e.g. BANK_DEPOSIT requires `paymentProofMediaId`); compute totals; create Order + OrderItems + status PENDING + `paymentProofMediaId`; deduct inventory; store Idempotency-Key.
   - Order is created in **PENDING** and remains there until admin verifies payment (see state machine).
3. **Admin:** Marks payment as verified by moving order to CONFIRMED (or PROCESSING); no separate “payment_pending” status required if PENDING is interpreted as “awaiting confirmation / payment verification” for bank-transfer orders.

Optional “add proof to existing order” (if you allow creating an order without proof and adding it later):

- Endpoint: e.g. `PATCH /orders/:id/payment-proof` with `mediaId` (or multipart upload).
- **Idempotency:** Use a key per order (e.g. `orderId` + `idempotencyKey` for the patch). If the order already has `paymentProofMediaId` set for this “logical” update, return 200 and no-op. Otherwise set it once. This prevents double-attaching or duplicate processing when the user clicks “Upload” multiple times.

---

## 4. Order State Machine

Allowed transitions (already enforced in code):

| From       | To         |
|-----------|------------|
| PENDING   | CONFIRMED, PROCESSING, SHIPPED, CANCELLED |
| CONFIRMED | PROCESSING, SHIPPED, CANCELLED |
| PROCESSING| SHIPPED, CANCELLED |
| SHIPPED   | DELIVERED, CANCELLED |
| DELIVERED | — (terminal) |
| CANCELLED | — (terminal) |

**Semantics for manual payment:**

- **PENDING**
  - COD: order placed; awaiting confirmation/shipping.
  - BANK_DEPOSIT: order placed with proof uploaded; **awaiting admin payment verification**. So “payment_pending” is represented by PENDING + `paymentMethod === BANK_DEPOSIT` (and optionally a flag or sub-status if you add it later).
- **CONFIRMED**: Payment verified (admin confirmed) or COD accepted; order can move to processing/shipping.
- **PROCESSING / SHIPPED / DELIVERED**: Fulfilment states.
- **CANCELLED**: Terminal. **Inventory must be restored** (once per order); idempotent restore in the same transaction as status update is recommended.

You can introduce a separate **PAYMENT_PENDING** status if you want it explicit in reports and UI; then: BANK_DEPOSIT orders start as PAYMENT_PENDING, and admin moves them to CONFIRMED (or PENDING). The rest of the flow (inventory, idempotency, transitions) stays the same.

---

## 5. Idempotency

### 5.1 Checkout (order creation)

- **Client:** Generate a stable **Idempotency-Key** per “checkout attempt” (e.g. UUID per checkout page load or per “Place order” click) and send it on **every** `POST /orders/checkout` for that attempt (including retries).
- **Server:** Header: `Idempotency-Key: <key>`.
  - At start of transaction: look up key. If key exists and not expired and has `orderId` → load that order, return it, **do not create order or deduct inventory**.
  - Otherwise: create order, deduct inventory, write Idempotency-Key with `orderId` and `expiresAt` (e.g. 24h) in the **same** transaction.
- **Result:** Network retries, double-clicks, or multiple tabs submitting with the same key produce exactly one order and one deduct.

**Frontend change:** Ensure the checkout form sends `Idempotency-Key` (e.g. one UUID per form session or per submit) so that retries are safe.

### 5.2 Payment proof upload

- **Current:** Each upload creates a new Media row and returns a new `id`. Submitting checkout twice with the **same** Idempotency-Key returns the same order (with that proof attached once). So “upload then submit twice” = one order, one proof.
- **If you add “attach proof to existing order”:** Use a per-order idempotency key for the attach operation (e.g. in body or header) so that “user uploads same proof twice for same order” is a no-op after the first success.

---

## 6. Inventory: When to Reserve / Deduct / Release

- **Reservation:** Not used in the current design. Stock is **deducted at order creation** only.
- **Deduct:** In the same transaction as creating the order and order items; atomic `UPDATE product SET stock_quantity = stock_quantity - qty WHERE id = ? AND stock_quantity >= qty`. If any product has insufficient stock, the whole transaction rolls back and the API returns 400 (no order created).
- **Release (restore):** When order status transitions to **CANCELLED**. Restore quantity per product from that order’s items; idempotent (e.g. if a RESTORE movement for that orderId already exists, skip). Run restore in the **same transaction** as the status update so you never have “cancelled but stock not restored”.

**Inventory changes while checkout is in progress:**

- Quote (GET) can be stale by the time the user clicks “Place order”. So **always** re-check stock at order creation. If stock dropped in between, creation fails with “Insufficient stock” and the transaction rolls back; client can refresh quote and cart (e.g. remove unavailable items or show error). No reservation window means no need to “release” abandoned checkouts.

---

## 7. Failure Scenarios and Mitigations

| Scenario | Mitigation |
|----------|------------|
| User submits checkout multiple times (double-click, retry, second tab) | Idempotency-Key: same key → same order returned; no second order, no double deduct. |
| User uploads payment screenshot more than once | Same key on checkout → one order. If “attach proof to order” exists, use idempotent attach by key. |
| Admin approves/rejects payment late | No special handling; order stays PENDING until status is changed. No timeout that auto-cancels (unless you add a business rule). |
| Order cancelled after inventory reserved | On transition to CANCELLED, restore stock in same transaction as status update; idempotent restore. |
| Inventory drops while checkout in progress | Order creation runs atomic deduct; if insufficient stock, transaction fails and returns 400; no order created. |
| User refreshes or resubmits | Same Idempotency-Key → server returns existing order; client should treat as success (show order id, don’t clear cart if you want to be cautious until response is seen). |
| Network failure during checkout | Client retries with **same** Idempotency-Key; server returns existing order if it was created, or creates once. No double order. |
| Cart empty / mixed currency / invalid items | Server validates; rejects with 400. Cart consistency: client prevents submit when empty/mixed; server still validates items and quantities. |

---

## 8. Common Production Bugs (Manual-Payment Systems) and How This Design Avoids Them

| Bug | Prevention |
|-----|------------|
| **Duplicate orders** (double submit, retry) | Idempotency-Key on checkout; one key → one order. |
| **Double inventory deduct** | Deduct only inside the same transaction as order creation; idempotency path returns existing order and skips deduct. |
| **Order created but inventory not deducted** | Single transaction: order + items + deduct + idempotency row; rollback on any failure. |
| **Cancelled order but stock not restored** | Restore in same transaction as status → CANCELLED; idempotent restore so repeated updates don’t double-restore. |
| **Wrong totals (client/server mismatch)** | Totals computed only on server (quote + create); client cart is for display only. |
| **Payment proof attached to wrong order or lost** | Proof linked at creation via `paymentProofMediaId`; one order per Idempotency-Key. Optional: idempotent “attach proof” if you allow late attachment. |
| **Bank order shipped before payment verified** | Workflow: keep BANK_DEPOSIT orders in PENDING until admin sets CONFIRMED (or PAYMENT_VERIFIED); fulfilment transitions (PROCESSING → SHIPPED) after that. |
| **Relying on frontend for stock or totals** | Server validates and computes; quote is for UX only; order creation fails with clear error if stock insufficient. |
| **Race: two checkouts for last unit** | Atomic deduct with `WHERE stock_quantity >= qty`; one request wins, the other gets 0 rows updated and transaction fails. |

---

## 9. Recommended Implementation Checklist

- [x] **Checkout in one transaction:** Order + OrderItems + deduct + Idempotency-Key (already done).
- [x] **Cancel restores stock** in same transaction as status update (already done).
- [ ] **Frontend:** Send **Idempotency-Key** on every checkout request (generate once per checkout session; reuse on retry).
- [ ] **Quote:** Optionally include per-line “in stock” or max quantity from current `stockQuantity` so the client can warn or disable checkout; final authority remains at order creation.
- [ ] **Bank-transfer semantics:** Document that PENDING + BANK_DEPOSIT = “awaiting payment verification”; admin moves to CONFIRMED when verified. Optionally add PAYMENT_PENDING or a “payment_verified” flag if needed for reporting.
- [ ] **Optional:** “Attach payment proof to existing order” endpoint with its own idempotency key if product requirement is to allow proof upload after order creation.

This design keeps a clear separation between cart (client), checkout (server: quote + create order + inventory), and order (server: state machine and proof linkage), and makes checkout and restore idempotent and safe under concurrency and retries.
