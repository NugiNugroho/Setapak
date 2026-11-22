import { ComingSoon } from "@/components/ComingSoon";
export const metadata = { title: "Weekly Review" };
export default function Page() {
  return <ComingSoon title="Weekly Review" phase="Fase 4" items={["Ringkasan task, keuangan, tracks, goal otomatis", "Konsistensi habit dan saran level", "Refleksi dan 3 prioritas minggu depan menjadi task"]} />;
}
