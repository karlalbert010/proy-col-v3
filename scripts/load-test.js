/* eslint-disable no-console */
const DEFAULT_BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3001';
const DEFAULT_CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 50);
const DEFAULT_REQUESTS_PER_USER = Number(process.env.LOAD_REQUESTS_PER_USER || 5);
const DEFAULT_USERNAME = process.env.LOAD_USERNAME || 'admin';
const DEFAULT_PASSWORD = process.env.LOAD_PASSWORD || 'admin123';

function buildHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function login(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const payload = await response.json();

  if (!response.ok || !payload?.data?.token) {
    throw new Error(`No se pudo obtener token. Status=${response.status} Message=${payload?.message || 'sin detalle'}`);
  }

  return payload.data.token;
}

async function requestWithTiming(baseUrl, token, path) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(token)
  });
  const elapsedMs = performance.now() - startedAt;

  return {
    ok: response.ok,
    status: response.status,
    elapsedMs
  };
}

async function virtualUser(baseUrl, token, requestsPerUser) {
  const results = [];

  for (let i = 0; i < requestsPerUser; i += 1) {
    results.push(await requestWithTiming(baseUrl, token, '/anios'));
  }

  return results;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function run() {
  const baseUrl = DEFAULT_BASE_URL;
  const concurrency = DEFAULT_CONCURRENCY;
  const requestsPerUser = DEFAULT_REQUESTS_PER_USER;
  const totalRequests = concurrency * requestsPerUser;

  console.log('== Load test cole-api ==');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Usuarios concurrentes: ${concurrency}`);
  console.log(`Requests por usuario: ${requestsPerUser}`);
  console.log(`Total requests estimados: ${totalRequests}`);

  const token = await login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);

  const globalStart = performance.now();
  const all = await Promise.all(
    Array.from({ length: concurrency }, () => virtualUser(baseUrl, token, requestsPerUser))
  );
  const totalElapsedMs = performance.now() - globalStart;

  const flat = all.flat();
  const okCount = flat.filter((x) => x.ok).length;
  const failCount = flat.length - okCount;
  const latencies = flat.map((x) => x.elapsedMs);

  const rps = flat.length / (totalElapsedMs / 1000);

  console.log('\n== Resultado ==');
  console.log(`Requests ejecutados: ${flat.length}`);
  console.log(`OK: ${okCount}`);
  console.log(`Fail: ${failCount}`);
  console.log(`Duracion total: ${totalElapsedMs.toFixed(2)} ms`);
  console.log(`Throughput aproximado: ${rps.toFixed(2)} req/s`);
  console.log(`Latencia p50: ${percentile(latencies, 50).toFixed(2)} ms`);
  console.log(`Latencia p95: ${percentile(latencies, 95).toFixed(2)} ms`);
  console.log(`Latencia p99: ${percentile(latencies, 99).toFixed(2)} ms`);

  if (failCount > 0) {
    const byStatus = flat.reduce((acc, item) => {
      const key = String(item.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log('Errores por status:', byStatus);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Load test error:', error.message);
  process.exit(1);
});
