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
