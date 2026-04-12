export function PolymarketGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width={size} height={size}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 15V9h4.3a2.7 2.7 0 0 1 0 5.4H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.2 12.1 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
