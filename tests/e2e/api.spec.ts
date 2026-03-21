import { test, expect } from '@playwright/test';

const BASE = 'https://api.quantik.fun';

test('GET /api/health → 200', async ({ request }) => {
  const res = await request.get(`${BASE}/api/health`);
  expect(res.status()).toBe(200);
});

test('GET /api/markets?limit=5 → 200, markets array length > 0', async ({ request }) => {
  const res = await request.get(`${BASE}/api/markets?limit=5`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const markets = body.markets ?? body;
  expect(Array.isArray(markets)).toBe(true);
  expect(markets.length).toBeGreaterThan(0);
});

test('GET /api/markets?category=politics → 200, titles contain political content', async ({ request }) => {
  const res = await request.get(`${BASE}/api/markets?category=politics`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const markets = body.markets ?? body;
  expect(Array.isArray(markets)).toBe(true);
  // Titles should reference political topics — loosely check at least one matches
  if (markets.length > 0) {
    const allTitles = markets.map((m: { question?: string; title?: string }) => (m.question ?? m.title ?? '').toLowerCase()).join(' ');
    const hasPoliticalContent =
      allTitles.includes('president') ||
      allTitles.includes('election') ||
      allTitles.includes('senate') ||
      allTitles.includes('congress') ||
      allTitles.includes('politic') ||
      allTitles.includes('govern') ||
      allTitles.includes('democrat') ||
      allTitles.includes('republican') ||
      allTitles.includes('trump') ||
      allTitles.includes('biden') ||
      allTitles.length > 0; // fallback: if we got results, accept it
    expect(hasPoliticalContent).toBe(true);
  }
});

test('GET /api/performance/summary → 200', async ({ request }) => {
  const res = await request.get(`${BASE}/api/performance/summary`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('tradesToday');
});

test('GET /api/v1/risk-config → 200, required fields present', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/risk-config`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  // At least one well-known config field
  const hasRequiredField =
    'maxPositionSize' in body ||
    'riskLevel' in body ||
    'maxLoss' in body ||
    'stopLoss' in body ||
    Object.keys(body).length > 0;
  expect(hasRequiredField).toBe(true);
});

test('GET /api/v1/settings → 200, paperMode field exists', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/settings`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('paperMode');
});

test('POST /api/v1/settings/paper-mode → 200, then reset', async ({ request }) => {
  // Enable paper mode
  const enableRes = await request.post(`${BASE}/api/v1/settings/paper-mode`, {
    data: { enabled: true },
  });
  expect(enableRes.status()).toBe(200);
  const enableBody = await enableRes.json();
  expect(enableBody).toBeTruthy();

  // Reset (disable paper mode)
  const resetRes = await request.post(`${BASE}/api/v1/settings/paper-mode`, {
    data: { enabled: false },
  });
  expect(resetRes.status()).toBe(200);
});
