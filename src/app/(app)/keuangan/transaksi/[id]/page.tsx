import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { loadTxFormData } from "@/lib/finance-data";
import { TX_FIELDS, type Tx } from "@/lib/finance";
import { TxForm } from "@/components/finance/TxForm";

export const metadata = { title: "Ubah transaksi" };

export default async function EditTx({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const [{ data: tx }, data] = await Promise.all([
    supabase.from("transactions").select(TX_FIELDS).eq("id", id).maybeSingle(),
    loadTxFormData(supabase),
  ]);
  if (!tx) notFound();
  const back = `/keuangan/transaksi?m=${(tx as Tx).tx_date.slice(0, 7)}`;
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ubah transaksi</h1>
        <Link href={back} aria-label="Tutup" className="btn size-10 px-0"><X size={18} aria-hidden /></Link>
      </header>
      <TxForm initial={tx as Tx} {...data} today={todayISO(profile.timezone)} back={back} preset={{}} />
    </div>
  );
}
