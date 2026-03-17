import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoading({ cards = 6 }: { cards?: number }) {
  return (
    <div className="command-center-shell">
      <div className="space-y-4 mb-6">
        <Skeleton width={140} height={12} borderRadius={999} />
        <Skeleton width="60%" height={32} borderRadius={10} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <section key={i} className="command-center-card">
            <div className="space-y-4">
              <Skeleton width={100} height={10} borderRadius={999} />
              <Skeleton width="60%" height={24} borderRadius={8} />
              <Skeleton width="100%" height={80} borderRadius={12} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
