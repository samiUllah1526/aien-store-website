# Main Website × Backend API — Integration Plan

**Goal:** Connect the main public website (Astro + React + Tailwind) to the existing NestJS backend so the site shows admin-managed products and supports guest + registered user checkout.

**Audience:** Implementation team. Use this as the single source of truth before writing code.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MAIN WEBSITE (Astro)                             │
│  Port: e.g. 4322 or 3001  │  Public-facing, SSR + client islands         │
│  - Shop: product list/detail from API                                    │
│  - Cart: client state (Zustand + localStorage)                           │
│  - Checkout: guest (email) or logged-in (JWT) → POST order                │
│  - Optional: /account (login, register, order history)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST (fetch)
                                      │ PUBLIC_API_URL (env)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NESTJS BACKEND                                   │
│  Port: 3000  │  Same app as admin; route-level public vs protected      │
│  - GET /products, /products/slug/:slug, /products/:id  (public)          │
│  - POST /orders/checkout (public) → guest or optional JWT                │
│  - POST /auth/login, POST /auth/register (public)                        │
│  - GET /orders/me (optional, JWT) → “my orders”                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Separation of concerns**

- **Backend:** Single API; no “admin vs store” apps. Public routes for storefront; protected routes for admin (existing guards).
- **Main website:** Only consumes API; no direct DB or admin logic. Auth = JWT in memory/localStorage (or httpOnly cookie if you add it later); cart stays client-side.

---

## 2. Current State vs Gaps

| Area | Current state | Gap |
|------|----------------|----------------|
| **Products (main site)** | Static `src/data/products.json`; shop and detail pages use it | Fetch from `GET /products` and `GET /products/slug/:slug`; map API response to existing UI types; handle loading/error. |
| **Product images** | Placeholder or local paths | Backend returns paths like `/api/media/file/…`; main site must resolve with `PUBLIC_API_URL` (or backend serves with full URL in response). |
| **Orders** | Checkout is UI-only; no API call | Backend `POST /orders` is **protected** (JWT + `orders:write`). Need **public** order-placement endpoint (guest + optional user link). |
| **Auth (storefront)** | None | Only `POST /auth/login` exists. Need **registration** for “sign up” and a clear story for “logged-in checkout” (optional JWT on order). |
| **CORS** | Allows admin origin (e.g. localhost:4321) | Add main-website origin (e.g. localhost:4322) so browser allows API calls. |
| **Order ↔ User** | Order has `customerEmail` only; no `userId` | To support “my orders,” add optional `customerUserId` (or similar) to Order; set when request has valid JWT. |

---

## 3. Authentication, Guest Checkout, and Session Management

### 3.1 Principles

- **Guest checkout:** No account required. Identify by email only; no JWT.
- **Registered checkout:** Optional login/signup; send JWT with order so backend can attach `customerUserId` and later expose “my orders.”
- **Session:** Keep simple: JWT in memory + optional persistence in `localStorage` (same pattern as admin). For production, consider moving to httpOnly cookie + same-site.

### 3.2 Suggested Auth Flows

| Flow | Who | How |
|------|-----|-----|
| **Guest** | Anyone | Checkout form: email (required), name optional. Submit to public `POST /orders/checkout`. No token. |
| **Login** | Returning user | Form → `POST /auth/login` → store `accessToken` (e.g. in a small auth store + localStorage key like `store_token`). Redirect or stay on checkout. |
| **Register** | New user | Form → `POST /auth/register` (to be added) → backend creates User (no admin roles) → return JWT → same as login. |
| **Checkout as logged-in** | Logged-in user | Same `POST /orders/checkout` payload; add header `Authorization: Bearer <token>`. Backend sets `customerUserId` when token valid. |

### 3.3 Session / Token Storage (Main Website)

- **Recommendation:** One auth store (e.g. Zustand or React context) + one localStorage key (e.g. `store_token`) for persistence across reloads.
- **Logout:** Clear token and redirect to home or shop.
- **Token use:** Attach to all requests that need it (e.g. “my orders,” optional “update profile” later). For guest and public product/order placement, no token.

### 3.4 Security Considerations

- **Registration:** Rate-limit and validate (email format, strong password). Consider email verification later.
- **Login:** Existing backend already returns JWT; main site only stores and sends it.
- **Order placement:** Public endpoint must be rate-limited (e.g. per IP or per email) and validated (items, quantities, product existence) to avoid abuse.
- **CORS:** Allow only main-website origin(s); keep credentials: true if using cookies later.

---

## 4. Backend Changes Required

### 4.1 Public Order Placement (Guest + Optional User)

- **New route:** `POST /orders/checkout` (or keep `POST /orders` and make it public with a dedicated DTO).
- **Behavior:**
  - **Public:** No JWT required. Body: same as current `CreateOrderDto` (e.g. `customerEmail`, optional `customerName`, `items: [{ productId, quantity }]`). Validate items (product exists, quantity > 0), compute total, create order, return order id + summary.
  - **Optional JWT:** If `Authorization: Bearer <token>` is present and valid, set `customerUserId` on the order (requires schema change below). Do not require admin permissions; any authenticated “store” user can link their order.
- **Guards:** Use `@Public()` for this route (or a dedicated “store” guard that allows optional JWT). Do not use `RequirePermission('orders:write')` for this endpoint.

### 4.2 Schema Change (Optional but Recommended)

- **Order:** Add optional `customerUserId` (UUID, FK to User, nullable). When present, this order belongs to a registered customer for “my orders” and future features.
- **Migration:** Add column; backfill null for existing orders.

### 4.3 Registration (Sign Up)

- **New route:** `POST /auth/register`.
- **Body:** e.g. `{ name, email, password }`. Validate (email format, password strength).
- **Behavior:** Create User with status ACTIVE; no admin roles. Hash password; return same shape as login (e.g. `accessToken`, `user`, `expiresIn`). Mark route `@Public()`.

### 4.4 “My Orders” (Optional for Phase 1)

- **New route:** `GET /orders/me` (or `GET /orders?mine=1`). Protected with JWT only (no permission check); return orders where `customerUserId = req.user.id`, ordered by createdAt desc.

### 4.5 CORS

- Add main-website origin to the allowed list (e.g. from env `CORS_ORIGIN` or a dedicated `STORE_ORIGIN`). Example: `http://localhost:4322` for dev.

### 4.6 Product and Media (No Change Required)

- `GET /products` and `GET /products/slug/:slug` are already public. Ensure response shape (price in cents, image paths) is documented so the main site can map it. If image URLs are relative (e.g. `/api/media/file/...`), the main site must prefix with `PUBLIC_API_URL` when rendering `<img>`.

---

## 5. Frontend (Main Website) Changes Required

### 5.1 Environment and API Client

- **Env:** `PUBLIC_API_URL` (e.g. `http://localhost:3000`) for API base. Use in one place (e.g. `src/lib/api.ts`).
- **API client:** Centralized `fetch` wrapper:
  - Base URL from `PUBLIC_API_URL`.
  - Optional: attach `Authorization: Bearer <token>` from auth store when token exists.
  - Parse JSON; on non-2xx throw or return error object for handling in UI.
- **Types:** Define (or reuse from backend contract) types for Product (list/detail), Order create payload, and Order summary response.

### 5.2 Product Listing and Detail

- **Shop list:** Replace static import from `products.json` with data loading:
  - **Option A (SSR):** In Astro page (e.g. `shop/index.astro`), `fetch(PUBLIC_API_URL + '/products')` in the page, pass `products` (and maybe `categories` for filters) to `<ShopGrid>`.
  - **Option B (client):** Load products in a React component with `useEffect`; show loading skeleton and error state.
- **Recommendation:** Prefer **SSR** for initial list (SEO, first paint); keep client-side filtering (category, price) in `ShopGrid` as today.
- **Product detail:** Same idea: fetch by slug (e.g. `GET /products/slug/:slug`) in the dynamic route (`shop/[...slug].astro`) and pass to detail UI. Handle 404.
- **Image URLs:** If backend returns relative paths, prefix with `PUBLIC_API_URL` when building `image`/`images` for components (e.g. in a small mapper or in the layout).

### 5.3 Cart (No Structural Change)

- Cart remains client-side (Zustand + localStorage). Ensure cart items use `productId` (and size if applicable) so they match backend `productId` and quantities for the order payload. When loading products from API, ensure product list/detail exposes `id` and `price` (cents) so Add to Cart can push correct data.

### 5.4 Checkout Form and Order Placement

- **Collect:** Email (required), optional name; keep payment/shipping UI as today (COD / bank). No password for guest.
- **Optional:** “Log in” / “Sign up” links; if user logs in or registers, store token and optionally prefill email/name from JWT payload.
- **Submit:** Build payload `{ customerEmail, customerName?, items: [{ productId, quantity }] }` from cart (map cart items to productId + quantity; backend does not need size for order item if you don’t store it—confirm with backend contract). POST to public `POST /orders/checkout` (or equivalent). Send `Authorization` header if user is logged in.
- **After submit:** Show success with order id; clear cart (or redirect to a “thank you” page that clears cart). On error, show validation/error message and do not clear cart.

### 5.5 Auth UI (Login / Register)

- **Pages:** e.g. `/login` and `/register` (or modals). Forms: email, password; register adds name.
- **Login:** POST to `POST /auth/login`; store token; redirect to checkout or account.
- **Register:** POST to `POST /auth/register`; store token; same as login.
- **Logout:** Clear token and redirect. Optional: show “Account” / “Log out” in nav when logged in.

### 5.6 Loading and Error Handling

- **Products:** Loading state (skeleton or spinner); error state (message + retry). For SSR, handle fetch errors in the page and render an error message or error layout.
- **Order submit:** Disable submit button while loading; show inline error (e.g. “Invalid items” or “Server error”); on success, clear cart and show confirmation.
- **Auth:** Inline errors for invalid credentials or duplicate email (register).

---

## 6. API Contract Summary (Reference)

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| GET | /products | No | List products (query: page, limit, categoryId, etc.) |
| GET | /products/slug/:slug | No | Product by slug |
| GET | /products/:id | No | Product by id |
| POST | /auth/login | No | Store login → JWT |
| POST | /auth/register | No | Store signup → JWT (new) |
| POST | /orders/checkout | No (optional JWT) | Place order (guest or link to user) (new) |
| GET | /orders/me | JWT | “My orders” (new, optional) |

Existing admin-only routes (e.g. GET/POST /orders for admin, POST /products, etc.) stay protected; no change.

---

## 7. Implementation Order (Step-by-Step)

1. **Backend: Public order placement**
   - Add optional `customerUserId` to Order (migration).
   - Add public `POST /orders/checkout` (or equivalent) with validation and optional JWT attachment. Document request/response.
2. **Backend: Registration**
   - Add `POST /auth/register` (create User, no roles); return JWT. Rate-limit and validate.
3. **Backend: CORS**
   - Add main-website origin (env-driven).
4. **Main website: API client and env**
   - Add `PUBLIC_API_URL` and a small `api` helper (get, post, optional auth header).
5. **Main website: Products from API**
   - Replace static JSON with fetch in shop index and slug page; map response to existing Product type; handle images with `PUBLIC_API_URL`; add loading/error states.
6. **Main website: Checkout → real order**
   - In CheckoutForm, submit to `POST /orders/checkout` with cart items; handle success (clear cart, thank you) and errors.
7. **Main website: Auth (login/register)**
   - Add login and register pages (or modals); wire to auth API; add minimal auth store and token persistence; optional “Account” in nav.
8. **Main website: Optional “My orders”**
   - If backend has `GET /orders/me`, add an account or “My orders” page that calls it with JWT.

---

## 8. Missing Implementation Points and Production Readiness

- **Rate limiting:** Add global or route-level rate limiting (e.g. `POST /auth/register`, `POST /orders/checkout`) to prevent abuse.
- **Email verification:** Registration can be extended with “verify email” before first login; not required for MVP.
- **Order confirmation email:** Backend already has MailModule; consider sending a “order received” email to `customerEmail` when order is created (guest or not).
- **Stock/inventory:** Not in scope here; if added later, validate availability in `POST /orders/checkout` and return clear errors.
- **Image CDN:** If images are large, consider serving them via CDN or a separate asset domain; for now, `PUBLIC_API_URL` + path is enough.
- **Error messages:** Backend should return consistent error shape (e.g. `{ message, statusCode }`); frontend should display them without exposing internals.
- **Validation:** Backend already uses class-validator on DTOs; ensure CreateOrderDto (or checkout DTO) validates productId format and quantity range; frontend should validate email and non-empty cart before submit.
- **HTTPS and cookies:** In production, use HTTPS; if you later move JWT to httpOnly cookie, set SameSite and Secure and ensure CORS and credentials align.

---

## 9. Summary

- **Products:** Main website fetches from existing public product API; replace static JSON and resolve image URLs with `PUBLIC_API_URL`.
- **Orders:** Add a **public** checkout endpoint (guest + optional JWT for customer link) and optional `customerUserId` on Order; keep admin order management as-is.
- **Auth:** Add **registration** and use existing **login**; store JWT on the main site for “logged-in” checkout and optional “my orders.”
- **CORS:** Allow main-website origin.
- Implement in the order above: backend order + register + CORS → frontend API client → products from API → checkout submit → auth UI → optional “my orders.”

This plan keeps a single backend, clear public vs protected boundaries, and a scalable path for guest and registered users while staying production-minded (rate limiting, validation, errors, and security).
