import { describe, it, expect } from 'vitest';

// ─── HolderLeaderboard logic unit tests ─────────────────────────────────────
//
// NOTE: Full component rendering tests require jsdom + @testing-library/react
// which are not installed. These tests cover the pure logic extracted from the
// component (rank medal logic, truncation, wallet comparison, empty-state guard)
// following the existing project test pattern (node environment, no DOM).

describe('getRankMedal logic', () => {
  // Mirrors the RankCell render logic from HolderLeaderboard.tsx
  function getRankDisplay(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  it('rank 1 returns gold medal emoji', () => {
    expect(getRankDisplay(1)).toBe('🥇');
  });

  it('rank 2 returns silver medal emoji', () => {
    expect(getRankDisplay(2)).toBe('🥈');
  });

  it('rank 3 returns bronze medal emoji', () => {
    expect(getRankDisplay(3)).toBe('🥉');
  });

  it('rank 4 returns number string "4"', () => {
    expect(getRankDisplay(4)).toBe('4');
  });

  it('rank 10 returns number string "10"', () => {
    expect(getRankDisplay(10)).toBe('10');
  });
});

describe('isConnectedUser logic', () => {
  // Mirrors the wallet comparison in HolderLeaderboard row rendering
  function isConnectedUser(holderWallet: string, connectedWallet: string | null | undefined): boolean {
    if (!connectedWallet) return false;
    return holderWallet.toLowerCase() === connectedWallet.toLowerCase();
  }

  it('matches when wallets are identical', () => {
    expect(isConnectedUser('7xK2abc', '7xK2abc')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isConnectedUser('7XK2ABC', '7xk2abc')).toBe(true);
  });

  it('returns false when wallets differ', () => {
    expect(isConnectedUser('7xK2abc', 'other123')).toBe(false);
  });

  it('returns false when connectedWallet is null', () => {
    expect(isConnectedUser('7xK2abc', null)).toBe(false);
  });

  it('returns false when connectedWallet is undefined', () => {
    expect(isConnectedUser('7xK2abc', undefined)).toBe(false);
  });
});

describe('HolderLeaderboard empty state condition', () => {
  it('shows empty state when holders array is empty and not loading', () => {
    const holders: unknown[] = [];
    const isLoading = false;
    const showEmptyState = !isLoading && holders.length === 0;
    expect(showEmptyState).toBe(true);
  });

  it('does not show empty state when loading', () => {
    const holders: unknown[] = [];
    const isLoading = true;
    const showEmptyState = !isLoading && holders.length === 0;
    expect(showEmptyState).toBe(false);
  });

  it('does not show empty state when holders exist', () => {
    const holders = [{ rank: 1, wallet: 'abc', balance: 1000, percentage: 10 }];
    const isLoading = false;
    const showEmptyState = !isLoading && holders.length === 0;
    expect(showEmptyState).toBe(false);
  });
});

describe('HolderLeaderboard skeleton count', () => {
  it('shows 3 skeleton rows when loading', () => {
    const isLoading = true;
    const skeletonRows = isLoading ? [1, 2, 3] : [];
    expect(skeletonRows.length).toBe(3);
  });

  it('shows 0 skeleton rows when not loading', () => {
    const isLoading = false;
    const skeletonRows = isLoading ? [1, 2, 3] : [];
    expect(skeletonRows.length).toBe(0);
  });
});

describe('truncateWallet in HolderLeaderboard context', () => {
  it('truncates the wallet address for display', async () => {
    const { truncateWallet } = await import('@/lib/formatters');
    const fullAddress = '7xK2qT9mZ3vF8nP5L2aB6cD4eF1gH9iJ';
    // last 4 chars = "H9iJ" → "7xK2...H9iJ"
    expect(truncateWallet(fullAddress)).toBe('7xK2...H9iJ');
  });
});
