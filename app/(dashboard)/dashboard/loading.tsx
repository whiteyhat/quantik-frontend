import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="command-center-shell">
      <section className="command-center-card command-center-card--blue command-center-hero overflow-hidden">
        <div className="command-center-hero-grid">
          <div className="space-y-4">
            <Skeleton width={120} height={12} borderRadius={999} />
            <Skeleton width="80%" height={42} borderRadius={12} />
            <Skeleton width="70%" height={18} borderRadius={8} />
          </div>
          <div className="command-center-kpi-grid">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} width="100%" height={120} borderRadius={20} />
            ))}
          </div>
        </div>
      </section>

      <section className="mission-rail">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="mission-rail-tile mission-rail-tile--neutral">
            <div className="mission-rail-copy">
              <Skeleton width={96} height={10} borderRadius={999} />
              <Skeleton width="70%" height={20} borderRadius={8} style={{ marginTop: 10 }} />
              <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
            </div>
          </article>
        ))}
        <article className="mission-rail-banner">
          <div className="mission-rail-banner-copy">
            <Skeleton width={120} height={12} borderRadius={999} />
            <Skeleton width="72%" height={14} borderRadius={8} style={{ marginTop: 10 }} />
          </div>
        </article>
      </section>

      <div className="command-center-grid">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className={columnIndex === 2 ? "command-center-column command-center-rail" : "command-center-column"}
          >
            {Array.from({ length: columnIndex === 1 ? 4 : 3 }).map((_, cardIndex) => (
              <section key={`${columnIndex}-${cardIndex}`} className="command-center-card">
                <div className="space-y-4">
                  <Skeleton width={120} height={12} borderRadius={999} />
                  <Skeleton width="50%" height={28} borderRadius={10} />
                  <Skeleton width="100%" height={90} borderRadius={16} />
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
