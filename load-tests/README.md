# k6 Load Tests

These scripts are for quick capacity checks on your deployed API.

## Install k6 (macOS)

```bash
brew install k6
```

## Scripts

- `health-baseline.js` - lightweight baseline (`GET /health`)
- `products-read.js` - read-heavy storefront traffic (`GET /store/products`)
- `auth-login-flow.js` - login load test (`POST /store/auth/login`) using real credentials from env

## Run examples

### 1) Health baseline

```bash
k6 run -e API_BASE_URL=https://api.aien.store load-tests/health-baseline.js
```

### 2) Products read

```bash
k6 run -e API_BASE_URL=https://api.aien.store load-tests/products-read.js
```

### 3) Login flow

```bash
k6 run \
  -e API_BASE_URL=https://api.aien.store \
  -e LOGIN_EMAIL="your-test-user@example.com" \
  -e LOGIN_PASSWORD="your-password" \
  load-tests/auth-login-flow.js
```

## Safety notes

- Prefer running against staging first.
- Login test uses real credentials; do not commit credentials.
- Avoid destructive endpoints for production load tests.
- Start small, then increase gradually.

## What to watch on VPS during test

```bash
top
pm2 monit
pm2 logs aien-backend --lines 100
```

Look for:
- high CPU saturation for long periods
- rising memory/swap pressure
- error spikes in logs

