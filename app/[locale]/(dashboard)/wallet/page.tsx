"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Link } from "@/i18n/navigation";
import { useQuantikStore } from "@/store/useQuantikStore";
import { SolanaBalanceCard, type SolanaTokenBalance } from "@/components/SolanaBalanceCard";

// Token program ID (standard SPL Token program)
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

type ParsedTokenAccountInfo = {
  tokenAmount: { uiAmount: number | null };
  mint: string;
};

export default function WalletPage() {
  const { connection } = useConnection();
  const solanaWallet = useQuantikStore((s) => s.solanaWallet);
  const solanaWalletLoading = useQuantikStore((s) => s.solanaWalletLoading);

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokens, setTokens] = useState<SolanaTokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!solanaWallet?.address) return;

    let active = true;
    setLoading(true);
    setError(null);

    const fetchBalances = async () => {
      try {
        const pubKey = new PublicKey(solanaWallet.address);

        // Fetch SOL balance
        const lamports = await connection.getBalance(pubKey);
        if (!active) return;
        setSolBalance(lamports / LAMPORTS_PER_SOL);

        // Fetch SPL token balances
        const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
          pubKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        if (!active) return;

        const tokenBalances: SolanaTokenBalance[] = tokenAccountsResponse.value
          .map((account): SolanaTokenBalance | null => {
            const info = account.account.data.parsed?.info as ParsedTokenAccountInfo | undefined;
            if (!info) return null;
            const amount = info.tokenAmount.uiAmount ?? 0;
            if (amount === 0) return null;
            return {
              mint: info.mint,
              symbol: null,        // Phase 2 will populate from token metadata
              name: null,          // Phase 2 will populate from token metadata
              amount,
              logoUri: null,       // Phase 2 will populate from token metadata
            };
          })
          .filter((t): t is SolanaTokenBalance => t !== null);

        setTokens(tokenBalances);
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Unable to fetch balances";
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBalances();

    // Refresh every 30s
    const iv = setInterval(fetchBalances, 30_000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [solanaWallet?.address, connection]);

  // ── Page structure ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 0" }}>
      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Solana Wallet
        </h1>
        <p
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: "rgba(255,255,255,0.60)",
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          Your connected wallet and token balances
        </p>
      </div>

      {/* State: loading wallet status */}
      {solanaWalletLoading && (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", margin: 0 }}>
            Loading wallet status...
          </p>
        </div>
      )}

      {/* State: no wallet connected */}
      {!solanaWalletLoading && !solanaWallet && (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#9678;</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              marginBottom: 8,
            }}
          >
            No wallet connected
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              marginBottom: 20,
            }}
          >
            Connect your Solana wallet from the sidebar to view balances.
          </div>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              padding: "6px 16px",
              borderRadius: 10,
              background: "rgba(10,132,255,0.18)",
              border: "1px solid rgba(10,132,255,0.30)",
              color: "rgba(10,132,255,0.90)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {/* State: wallet connected — show address card + balances */}
      {!solanaWalletLoading && solanaWallet && (
        <>
          {/* Wallet address card */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "14px 20px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#9945ff",
                display: "inline-block",
                boxShadow: "0 0 6px rgba(153,69,255,0.5)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>
                Connected Wallet
              </div>
              <div
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 13,
                  color: "rgba(255,255,255,0.92)",
                  wordBreak: "break-all",
                }}
              >
                {solanaWallet.address}
              </div>
            </div>
          </div>

          {/* Balances */}
          <SolanaBalanceCard
            solBalance={solBalance}
            tokens={tokens}
            loading={loading}
            error={error}
          />
        </>
      )}
    </div>
  );
}
