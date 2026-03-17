import { PublicHeader } from "@/components/arena/PublicHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="crystal-bg" />
      <PublicHeader />
      <main className="arena-public-main">{children}</main>
    </>
  );
}
