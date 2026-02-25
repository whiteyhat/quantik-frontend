import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Minimal API client simulation (mirrors what the real client does)
async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

describe('API client — error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws on 404 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );
    await expect(fetchJson('/api/nonexistent')).rejects.toThrow('HTTP 404');
  });

  it('throws on 500 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );
    await expect(fetchJson('/api/health')).rejects.toThrow('HTTP 500');
  });

  it('returns null for empty body on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    const result = await fetchJson('/api/health');
    expect(result).toBeNull();
  });

  it('parses JSON body correctly on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );
    const result = await fetchJson('/api/health');
    expect(result).toEqual({ status: 'ok' });
  });

  it('handles network error gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(fetchJson('/api/health')).rejects.toThrow('Failed to fetch');
  });
});
