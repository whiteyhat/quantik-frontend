"use client";

export function WalletActionButton({
  href,
  label,
  children,
  onClick,
  size = 20,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  size?: number;
}) {
  const sharedStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    transition: "all 180ms ease",
    position: "relative",
  };

  const tooltip = (
    <span
      style={{
        position: "absolute",
        left: "50%",
        bottom: "calc(100% + 6px)",
        transform: "translateX(-50%)",
        padding: "3px 7px",
        borderRadius: 6,
        background: "rgba(8,10,18,0.94)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.84)",
        fontSize: 10,
        lineHeight: 1,
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        whiteSpace: "nowrap",
        opacity: 0,
        pointerEvents: "none",
        transition: "opacity 160ms ease, transform 160ms ease",
      }}
      className="wallet-action-tooltip"
    >
      {label}
    </span>
  );

  const hoverIn = (target: HTMLElement) => {
    target.style.color = "rgba(255,255,255,0.82)";
    target.style.borderColor = "rgba(125,211,252,0.30)";
    target.style.background = "rgba(125,211,252,0.10)";
    target.style.transform = "translateY(-1px)";
    const tooltipNode = target.querySelector<HTMLElement>(".wallet-action-tooltip");
    if (tooltipNode) {
      tooltipNode.style.opacity = "1";
      tooltipNode.style.transform = "translateX(-50%) translateY(-2px)";
    }
  };

  const hoverOut = (target: HTMLElement) => {
    target.style.color = "rgba(255,255,255,0.34)";
    target.style.borderColor = "rgba(255,255,255,0.08)";
    target.style.background = "rgba(255,255,255,0.03)";
    target.style.transform = "translateY(0)";
    const tooltipNode = target.querySelector<HTMLElement>(".wallet-action-tooltip");
    if (tooltipNode) {
      tooltipNode.style.opacity = "0";
      tooltipNode.style.transform = "translateX(-50%)";
    }
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        style={sharedStyle}
        onMouseOver={(e) => hoverIn(e.currentTarget)}
        onMouseOut={(e) => hoverOut(e.currentTarget)}
      >
        {tooltip}
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{ ...sharedStyle, cursor: "pointer" }}
      onMouseOver={(e) => hoverIn(e.currentTarget)}
      onMouseOut={(e) => hoverOut(e.currentTarget)}
    >
      {tooltip}
      {children}
    </button>
  );
}
