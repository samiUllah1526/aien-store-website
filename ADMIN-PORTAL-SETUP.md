# E-Commerce Management Portal – Setup Guide

This document describes the internal e-commerce management portal setup: backend API and admin frontend.

---

## Suggested Folder Structure

### Backend (NestJS)

```
backend/
├── src/
│   ├── modules/           # Feature modules (modular architecture)
│   │   └── health/
│   │       ├── health.controller.ts
│   │       └── health.module.ts
│   ├── app.module.ts      # Root module
│   └── main.ts            # Application entry point
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env.example           # Environment variables template
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### Frontend (Astro + React + Tailwind)

```
admin-portal/
├── src/
│   ├── layouts/
│   │   └── AdminLayout.astro   # Shared admin layout (sidebar + content)
│   ├── pages/
│   │   ├── index.astro        # Landing → link to admin
│   │   └── admin/
│   │       ├── index.astro    # Dashboard
│   │       ├── products.astro # Products (placeholder)
│   │       └── orders.astro   # Orders (placeholder)
│   └── styles/
│       └── global.css         # Tailwind imports
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

### Backend

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Copy environment file and edit as needed
cp .env.example .env

# Start in development mode (watch mode)
npm run start:dev
```

- API base URL: http://localhost:3000 (configurable via `PORT` in `.env`)
- Health endpoint: http://localhost:3000/health
- Liveness: http://localhost:3000/health/live

### Frontend

```bash
cd admin-portal

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

- Admin UI: http://localhost:4321 (default Astro dev port)
- Dashboard: http://localhost:4321/admin

---

## Environment Variables (Backend)

| Variable   | Description       | Default |
|------------|-------------------|---------|
| `PORT`     | Server port       | `3000`  |
| `NODE_ENV` | `development` / `production` | `development` |

Add more variables in `.env` and `.env.example` as needed (e.g. database, external APIs).

### Admin Portal (Frontend)

All admin configuration lives in `admin-portal/src/lib/config.ts`. Set values via `.env` (see `admin-portal/.env.example` and `admin-portal/site.config.example`).

| Variable | Description | Default |
|----------|-------------|---------|
| `PUBLIC_API_URL` | Backend API base URL (no trailing slash) | `http://localhost:3000` |
| `PUBLIC_ADMIN_APP_NAME` | Admin app display name | `E-Commerce Admin` |
| `PUBLIC_ADMIN_FAVICON` | Favicon path | `/favicon.svg` |
| `PUBLIC_ADMIN_THEME_STORAGE_KEY` | Dark mode localStorage key | `admin_dark` |
| `PUBLIC_ADMIN_AUTH_TOKEN_KEY` | JWT localStorage key | `admin_token` |
| `PUBLIC_ADMIN_LOGIN_PATH` | Redirect path on 401 | `/admin/login` |
| `PUBLIC_MAIN_WEBSITE_URL` | Main storefront URL (optional) | (empty) |

For manual JWT injection during development: `localStorage.setItem('admin_token', 'YOUR_JWT')` (or the key from `PUBLIC_ADMIN_AUTH_TOKEN_KEY`).

---

## Adding New Modules (Backend)

Example for a new `products` module:

```bash
cd backend
nest g module modules/products
nest g controller modules/products --no-spec
nest g service modules/products --no-spec
```

Then register `ProductsModule` in `AppModule`.

---

## Adding New Admin Pages (Frontend)

1. Create a new `.astro` file in `src/pages/admin/` (e.g. `customers.astro`).
2. Use `AdminLayout` and add the route to the sidebar in `AdminLayout.astro`.

---

## Scripts

### Backend

- `npm run start:dev` – Dev with hot reload
- `npm run build` – Production build
- `npm run start:prod` – Run production build
- `npm run test` – Unit tests
- `npm run test:e2e` – E2E tests

### Frontend

- `npm run dev` – Dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build
