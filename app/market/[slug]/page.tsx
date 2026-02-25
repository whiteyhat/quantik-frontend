"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketHeader } from "@/components/MarketHeader";
import { PriceChart } from "@/components/PriceChart";
import { AgentPipeline } from "@/components/AgentPipeline";
import { PipelineControls } from "@/components/PipelineControls";
import { TradeConfirmationModal } from "@/components/TradeConfirmationModal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { slug } = use(params);

  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: '#606080' }}>
        <Link href="/" className="hover:underline" style={{ color: '#4488ff' }}>
          Dashboard
        </Link>
        <span>›</span>
        <span>Market Analysis</span>
        {market && (
          <>
            <span>›</span>
            <span className="line-clamp-1 max-w-xs" style={{ color: '#e0e0e0' }}>
              {market.question.slice(0, 50)}...
            </span>
          </>
        )}
      </div>

      {/* Market Header */}
      <MarketHeader slug={slug} />

      {/* Price Chart */}
      {market?.tokenId && (
        <PriceChart tokenId={market.tokenId} slug={slug} />
      )}

      {/* Agent Pipeline */}
      <AgentPipeline />

      {/* Pipeline Controls */}
      <PipelineControls slug={slug} />

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal />
    </div>
  );
}
