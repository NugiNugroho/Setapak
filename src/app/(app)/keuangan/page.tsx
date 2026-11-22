import { ComingSoon } from "@/components/ComingSoon";
export const metadata = { title: "Keuangan" };
export default function Page() {
  return <ComingSoon title="Keuangan" phase="Fase MVP" items={["Transaksi (pemasukan, pengeluaran, transfer) dengan input 3 ketukan", "Dompet, kategori & field kustom", "Budget bulanan dan rekap", "Tabungan, aset, hutang/piutang, net worth (Fase 3)"]} />;
}
