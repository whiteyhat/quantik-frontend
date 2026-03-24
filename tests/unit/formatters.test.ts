import { describe, it, expect } from 'vitest';

describe('Null/undefined safety — formatters', () => {
  it('(undefined ?? 0).toFixed(2) returns "0.00"', () => {
    const val: number | undefined = undefined;
    expect((val ?? 0).toFixed(2)).toBe('0.00');
  });

  it('Array.isArray(null) ? null : [] returns []', () => {
    const val: null = null;
    const result = Array.isArray(val) ? val : [];
    expect(result).toEqual([]);
  });

  it('Array.isArray([]) ? [] : [] returns []', () => {
    const val: unknown[] = [];
    const result = Array.isArray(val) ? val : [];
    expect(result).toEqual([]);
  });

  it('number?.toFixed(2) on undefined safely falls back', () => {
    const num = undefined as number | undefined;
    const formatted = num !== undefined ? num.toFixed(2) : '0.00';
    expect(formatted).toBe('0.00');
  });

  it('positive number formats correctly', () => {
    const val: number | undefined = 1234.5;
    expect((val ?? 0).toFixed(2)).toBe('1234.50');
  });
});

// ─── truncateWallet tests ─────────────────────────────────────────────────────

describe('truncateWallet', () => {
  // Import after function is added to formatters.ts — currently FAILING (RED)
  it('truncates a long address to first 4 + last 4 chars', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    // address = "7xK2qT9mZ3vF8nP5L2aB6cD4eF1gH9iJ", last 4 = "H9iJ"
    expect(truncateWallet('7xK2qT9mZ3vF8nP5L2aB6cD4eF1gH9iJ')).toBe('7xK2...H9iJ');
  });

  it('returns first 4 + "..." + last 4 for a 32-char address', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    // "7xK2" + "..." + last 4 chars of "7xK2qT9mZ3vF8nP5L2aB6cD4eF1gH9iJ"
    const addr = '7xK2qT9mZ3vF8nP5L2aB6cD4eF1gH9iJ';
    expect(truncateWallet(addr)).toBe(addr.slice(0, 4) + '...' + addr.slice(-4));
  });

  it('returns address unchanged when length <= 8', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    expect(truncateWallet('ABCD')).toBe('ABCD');
  });

  it('returns empty string for empty input', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    expect(truncateWallet('')).toBe('');
  });

  it('truncates exactly 8-char address (equal to leadChars + tailChars = 8)', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    // length === 8 means 4+4, so it should NOT truncate (address.length <= leadChars + tailChars)
    expect(truncateWallet('ABCDEFGH')).toBe('ABCDEFGH');
  });

  it('truncates a 9-char address', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    expect(truncateWallet('ABCDEFGHI')).toBe('ABCD...FGHI');
  });
});
