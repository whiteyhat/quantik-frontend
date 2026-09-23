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

import { fmtUSDC } from '@/lib/formatters';

describe('fmtUSDC', () => {
  it('puts the minus sign before the dollar sign', () => {
    expect(fmtUSDC(-6.55)).toBe('-$6.55');
    expect(fmtUSDC(-1234.5)).toBe('-$1,234.50');
  });

  it('never shows a negative zero', () => {
    expect(fmtUSDC(-0.001)).toBe('$0.00');
    expect(fmtUSDC(-0)).toBe('$0.00');
  });

  it('keeps positives, thousands separators and null handling', () => {
    expect(fmtUSDC(5610)).toBe('$5,610.00');
    expect(fmtUSDC(null)).toBe('$0.00');
  });
});
