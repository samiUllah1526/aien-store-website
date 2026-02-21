# Voucher Audit, History & Order Pricing

This document describes the voucher audit system, order-level pricing transparency, and how to set up background jobs.

## Overview

The voucher management system includes:

- **Voucher audit logs**: lifecycle events, validation attempts, redemptions
- **Order pricing persistence**: subtotal, shipping, discount breakdown stored per order
- **Admin APIs**: view audit logs, filter by action/date/user
- **Event abstraction**: ready for future Kafka/queue integration

## Data Model

### Order – Full Pricing

- `subtotal_cents`: Product subtotal before discounts (immutable)
- `shipping_cents`: Delivery charges (immutable)
- `discount_type`: PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING (immutable)
- `discount_cents`: Discount applied (immutable)
- `voucher_code`: Voucher code used (immutable)
- `total_cents`: Final payable total

**Invariant:** total_cents = subtotal_cents + shipping_cents - discount_cents

### VoucherAuditLog

- `voucher_id`, `action`, `actor_type`, `actor_id`, `order_id`, `code`, `result`, `error_code`, `metadata`, `request_id`, `created_at`

Actions: CREATED, UPDATED, ACTIVATED, DEACTIVATED, DELETED, VALIDATED, VALIDATION_FAILED, REDEEMED, EXPIRED

## Admin APIs

- GET /vouchers/audit-logs – Global audit logs
- GET /vouchers/:id/audit-logs – Audit logs for a voucher
- GET /vouchers/:id/stats – Stats plus redemptions (linked orders)

## Jobs Setup

See jobs-setup.md for how to configure the voucher expired job and archival.
