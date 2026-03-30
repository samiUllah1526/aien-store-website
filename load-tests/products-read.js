import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = (__ENV.API_BASE_URL || 'https://api.aien.store').replace(/\/$/, '');

export const options = {
  scenarios: {
    products_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
  },
};

export default function () {
  const res = http.get(`${API_BASE}/store/products`);
  check(res, {
    'products status is 200': (r) => r.status === 200,
    'products returns json': (r) => String(r.headers['Content-Type'] || '').includes('application/json'),
  });
  sleep(1);
}
