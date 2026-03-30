import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = (__ENV.API_BASE_URL || 'https://api.aien.store').replace(/\/$/, '');
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || '';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || '';

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  throw new Error(
    'LOGIN_EMAIL and LOGIN_PASSWORD are required. Example: k6 run -e API_BASE_URL=https://api.aien.store -e LOGIN_EMAIL=user@example.com -e LOGIN_PASSWORD=secret load-tests/auth-login-flow.js',
  );
}

export const options = {
  scenarios: {
    login_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 15 },
        { duration: '1m', target: 15 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const payload = JSON.stringify({
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });

  const res = http.post(`${API_BASE}/store/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login includes token': (r) => {
      try {
        const body = r.json();
        return Boolean(body && body.accessToken);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
