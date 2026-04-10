"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Info, Loader2 } from "lucide-react";
import { api, type SwapQuote, type AgentTokenStatus } from "@/lib/api";

interface TradingPanelProps {
  token: NonNullable<AgentTokenStatus["token"]>;
}

type TradeTab = "buy" | "sell";

export function TradingPanel({ token }: TradingPanelProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [tab, setTab] = useState<TradeTab>("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "success" | "error">("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch quote with 300ms debounce when amount changes
  useEffect(() => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setQuote(null); setQuoteError(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const q = await api.getSwapQuote(token.dbc_pool_address, parsed, tab);
        setQuote(q);
      } catch {
        setQuoteError("Unable to get price quote. Try again.");
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [amount, tab, token.dbc_pool_address]);

  const handleTrade = useCallback(async () => {
    if (!publicKey || !quote || !connected) return;
    setTxLoading(true);
    setTxStatus("idle");
    setTxError(null);
    try {
      // Build tx on backend
      const { transaction: txBase64 } = await api.buildSwapTx({
        poolAddress: token.dbc_pool_address,
        configAddress: token.dbc_config_address,
        tokenMint: token.token_mint,
        amountIn: quote.amountIn,
        minimumAmountOut: quote.minimumAmountOut,
        side: tab,
        ownerPublicKey: publicKey.toBase58(),
      });

      // Deserialize + sign with user wallet
      const tx = Transaction.from(Buffer.from(txBase64, "base64"));
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(signature, "confirmed");
      setTxStatus("success");
      setAmount("");
      setQuote(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel")) {
        setTxError("Transaction cancelled. Please try again.");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setTxError("Network error. Check your connection.");
      } else {
        setTxError(msg);
      }
      setTxStatus("error");
    } finally {
      setTxLoading(false);
    }
  }, [publicKey, quote, connected, tab, token, connection, sendTransaction]);

  // Format amounts from BN strings (6 decimal places)
  const fmtTokenAmount = (bnStr: string) => {
    const val = parseInt(bnStr) / 1_000_000;
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };
  const fmtPrice = (bnStr: string) => {
    const val = parseInt(bnStr) / 1_000_000;
    return `$${val.toFixed(6)}`;
  };

  const inputLabel = tab === "buy" ? "Amount (USDC):" : `Amount ($${token.token_symbol}):`;
  const outputLabel = tab === "buy"
    ? (quote ? `${fmtTokenAmount(quote.amountOut)} ${token.token_symbol} tokens` : "—")
    : (quote ? `${fmtTokenAmount(quote.amountOut)} USDC` : "—");
  const buttonText = tab === "buy" ? `Buy ${token.token_symbol}` : `Sell ${token.token_symbol}`;
  const buttonDisabled = !connected || !amount || parseFloat(amount) <= 0 || quoteLoading || txLoading || !quote;

  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 16,
    }}>
      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 8, padding: 3,
      }}>
        {(["buy", "sell"] as TradeTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(""); setQuote(null); setQuoteError(null); setTxStatus("idle"); }}
            style={{
              flex: 1, padding: "6px 12px", borderRadius: 6, border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === t ? (t === "buy" ? "#007AFF" : "rgba(255,159,10,0.85)") : "transparent",
              color: tab === t ? "#fff" : "rgba(255,255,255,0.50)",
              transition: "background 150ms ease",
            }}
          >
            {t === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {/* Wallet not connected info box */}
      {!connected && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: "rgba(0,122,255,0.10)",
          border: "1px solid rgba(0,122,255,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 12,
        }}>
          <Info size={14} style={{ color: "#007AFF", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>
            Connect your Solana wallet to trade
          </span>
        </div>
      )}

      {/* Amount input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", display: "block", marginBottom: 6 }}>
          {inputLabel}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.1"
          step="0.01"
          disabled={!connected || txLoading}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            background: connected ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.92)",
            fontSize: 15, outline: "none", opacity: connected ? 1 : 0.5,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Quote display */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}>You will receive:</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: quoteLoading ? "rgba(255,255,255,0.30)" : "#007AFF",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {quoteLoading
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : outputLabel
            }
          </span>
        </div>
        {quote && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Price per token:</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                {fmtPrice(quote.priceAfterSwap)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Slippage:</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>2.0% (max)</span>
            </div>
          </>
        )}
        {quoteError && (
          <div style={{ fontSize: 12, color: "#FF453A", marginTop: 4 }}>{quoteError}</div>
        )}
      </div>

      {/* Transaction status messages */}
      {txStatus === "success" && (
        <div style={{
          fontSize: 13, color: "#30D158", background: "rgba(48,209,88,0.10)",
          border: "1px solid rgba(48,209,88,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 8,
        }}>
          Transaction confirmed
        </div>
      )}
      {txStatus === "error" && txError && (
        <div style={{
          fontSize: 13, color: "#FF453A", background: "rgba(255,69,58,0.10)",
          border: "1px solid rgba(255,69,58,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 8,
        }}>
          {txError}
        </div>
      )}

      {/* Trade button */}
      <button
        onClick={connected ? () => void handleTrade() : undefined}
        disabled={buttonDisabled}
        style={{
          width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
          background: !connected
            ? "rgba(0,122,255,0.30)"
            : buttonDisabled
              ? "rgba(0,122,255,0.30)"
              : "#007AFF",
          color: !connected || buttonDisabled ? "rgba(255,255,255,0.40)" : "#fff",
          fontSize: 15, fontWeight: 600, cursor: buttonDisabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "background 150ms ease",
        }}
      >
        {txLoading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
        {txLoading ? "Confirming..." : !connected ? "Connect Wallet" : buttonText}
      </button>
    </div>
  );
}
