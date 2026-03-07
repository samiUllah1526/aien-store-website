# Deploy backend to Railway

## 1. Create a project and add Postgres (optional)

1. Go to [railway.com](https://railway.com) and create a project.
2. Add a **PostgreSQL** service: **+ New** → **Database** → **PostgreSQL** (or use an external DB and set `DATABASE_URL` in step 5).
3. Note the Postgres **private** URL for the backend (to avoid egress charges).

## 2. Add the backend service

1. In the same project: **+ New** → **GitHub Repo** (or **Empty Service** and connect repo later).
2. Select this repository.
3. Railway will add a service. Configure it to deploy **only** the backend:

## 3. Configure the backend service

In the backend service → **Settings** (or **Variables**):

- **Root Directory:** `backend`  
  So install/build/start run from the `backend/` folder.
- **Config file (optional):** If Railway doesn’t pick it up automatically, set **Config file path** to `backend/railway.toml`.

The repo’s `backend/railway.toml` already sets:

- **Build:** `npm run build` (runs in `backend/`)
- **Start:** `npm run start:prod`
- **Pre-deploy:** `npx prisma migrate deploy`
- **Healthcheck:** `GET /health`

**pg-boss (background jobs):** Uses the same database. The `pgboss` schema and job tables are created automatically when the app starts. No manual migration or script is required on deploy. For details (and a one-time fix if the schema was never created), see `backend/docs/jobs-setup.md`.

## 4. Variables

In the backend service → **Variables**, set at least:

- **DATABASE_URL** – From the Postgres service: use **Reference** → select Postgres → `DATABASE_PRIVATE_URL` or `DATABASE_URL` (private preferred).
- **NODE_ENV** – `production`
- **PORT** – Railway sets this automatically; keep it.
- **JWT_SECRET** – Strong secret for production.
- **CORS_ORIGIN** – Comma-separated frontend URLs (e.g. `https://yoursite.pages.dev,https://admin.yoursite.pages.dev`).
- **APP_URL**, **ADMIN_URL** – Public URLs of your main site and admin (for emails/links).

Add any other env vars your app needs (e.g. mail, storage, `HEALTH_HEAP_LIMIT_MB`).

## 5. Deploy

- Push to the connected branch; Railway will build and deploy from `backend/` using `railway.toml`.
- Or trigger **Deploy** manually from the dashboard.
- Open the generated URL and check `https://<your-app>.railway.app/health`.

## 6. (Optional) Custom domain and usage limit

- **Settings** → **Networking** → add a custom domain.
- **Usage** (workspace): set a **Hard limit** (e.g. $10) and a **Custom email alert** (e.g. $5).
