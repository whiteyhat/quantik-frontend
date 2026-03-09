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

      <div className="command-center-strip">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={index} className="command-center-strip-item">
            <Skeleton width={80} height={10} borderRadius={999} />
            <Skeleton width="60%" height={18} borderRadius={8} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </section>
        ))}
      </div>

      <div className="command-center-grid">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div key={columnIndex} className={columnIndex === 2 ? "command-center-column command-center-rail" : "command-center-column"}>
            {Array.from({ length: columnIndex === 1 ? 3 : 2 }).map((_, cardIndex) => (
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
