import Link from "next/link";
import { X } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { loadTxFormData } from "@/lib/finance-data";
import { TxForm } from "@/components/finance/TxForm";

export const metadata = { title: "Transaksi baru" };

export default async function NewTx({ searchParams }: { searchParams: Promise<{ kind?: string; s?: string; d?: string; back?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireProfile();
  const data = await loadTxFormData(supabase);
  const back = sp.back?.startsWith("/") ? sp.back : "/keuangan";
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaksi baru</h1>
        <Link href={back} aria-label="Tutup" className="btn size-10 px-0"><X size={18} aria-hidden /></Link>
      </header>
      {data.wallets.length === 0 ? (
        <p className="card p-5 text-sm">Buat dompet dulu di <Link href="/keuangan/atur" className="font-semibold text-accent">Dompet &amp; Kategori</Link>.</p>
      ) : (
        <TxForm
          initial={null}
          {...data}
          today={todayISO(profile.timezone)}
          back={back}
          preset={{ kind: sp.kind, savings_goal_id: sp.s, debt_id: sp.d }}
        />
      )}
    </div>
  );
}
