import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = (__ENV.API_BASE_URL || 'https://api.aien.store').replace(/\/$/, '');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 25 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'health status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
