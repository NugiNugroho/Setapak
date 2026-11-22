import { SubNav } from "@/components/ui";

export function FinanceNav({ current, m }: { current: string; m?: string }) {
  const q = m ? `?m=${m}` : "";
  return (
    <SubNav
      current={current}
      items={[
        { key: "ringkasan", label: "Ringkasan", href: `/keuangan${q}` },
        { key: "transaksi", label: "Transaksi", href: `/keuangan/transaksi${q}` },
        { key: "kekayaan", label: "Tabungan, Aset & Hutang", href: "/keuangan/kekayaan" },
        { key: "atur", label: "Dompet, Kategori & Budget", href: `/keuangan/atur${q}` },
      ]}
    />
  );
}
