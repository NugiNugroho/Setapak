import { ComingSoon } from "@/components/ComingSoon";
export const metadata = { title: "Tracks" };
export default function Page() {
  return <ComingSoon title="Tracks" phase="Fase MVP" items={["Track dengan metrik kustom", "Log sesi dan timer fokus", "Heatmap, streak, dan target mingguan"]} />;
}
