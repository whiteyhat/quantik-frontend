import { test, expect } from '@playwright/test';

const BASE = 'https://quantik-eight.vercel.app';

test('POST /api/relay {message:"hello"} → 200, response has reply field', async ({ request }) => {
  const res = await request.post(`${BASE}/api/relay`, {
    data: { message: 'hello' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('reply');
});

test('POST /api/relay {message:"what is my portfolio balance?"} → 200, reply is non-empty string', async ({ request }) => {
  const res = await request.post(`${BASE}/api/relay`, {
    data: { message: 'what is my portfolio balance?' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('reply');
  expect(typeof body.reply).toBe('string');
  expect(body.reply.trim().length).toBeGreaterThan(0);
});
