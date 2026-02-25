import { WalletHeader } from "@/components/WalletHeader";
import { MarketScanner } from "@/components/MarketScanner";
import { ActivePositions } from "@/components/ActivePositions";
import { RecentTrades } from "@/components/RecentTrades";

export default function DashboardPage() {
  return (
    <div>
      <WalletHeader />
      <MarketScanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivePositions />
        <RecentTrades />
      </div>
    </div>
  );
}
