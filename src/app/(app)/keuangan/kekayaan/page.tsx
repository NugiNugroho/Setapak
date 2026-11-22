import Link from "next/link";
import { Trash2, Archive } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import { loadPrivacy } from "@/lib/finance";
import { Money, PrivacyToggle } from "@/components/Privacy";
import { PageHeader, Card, Field, Bar, Empty } from "@/components/ui";
import { FinanceNav } from "@/components/finance/FinanceNav";
import {
  saveSavingsGoal, deleteSavingsGoal, saveAsset, addValuation, setAssetArchived, saveDebt, setDebtStatus,
} from "../actions";

export const metadata = { title: "Tabungan, aset & hutang" };

const ASSET_KIND = { investment: "Investasi", gold: "Emas", vehicle: "Kendaraan", property: "Properti", other: "Lainnya" } as const;

export default async function Kekayaan() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [priv, sav, assets, debts] = await Promise.all([
    loadPrivacy(supabase),
    supabase.from("savings_progress").select("*").order("created_at"),
    supabase.from("asset_latest").select("*").eq("archived", false).order("created_at"),
    supabase.from("debt_progress").select("*").order("status").order("created_at"),
  ]);
  const back = encodeURIComponent("/keuangan/kekayaan");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Keuangan" title="Tabungan, aset & hutang" actions={<PrivacyToggle withLabel />} />
      <FinanceNav current="kekayaan" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Tujuan tabungan">
          <p className="text-xs text-muted">Setor = catat pengeluaran yang ditautkan ke tujuan ini. Uangnya keluar dari dompet tapi tidak dihitung sebagai belanja.</p>
          {(sav.data ?? []).length ? (sav.data ?? []).map((g) => {
            const p = (Number(g.saved) / Number(g.target_amount)) * 100;
            return (
              <div key={g.id} className="flex flex-col gap-2 border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <b>{Math.round(p)}%</b>
                </div>
                <Bar pct={p} />
                <span className="text-xs text-muted">
                  <Money amount={Number(g.saved)} sensitive={priv.savings} /> dari <Money amount={Number(g.target_amount)} sensitive={priv.savings} />
                  {g.deadline ? ` · target ${formatShortDate(g.deadline, today)}` : ""}
                </span>
                <div className="flex gap-2">
                  <Link href={`/keuangan/transaksi/baru?kind=expense&s=${g.id}&back=${back}`} className="btn btn-primary min-h-9 text-sm">Setor</Link>
                  <Link href={`/keuangan/transaksi/baru?kind=income&s=${g.id}&back=${back}`} className="btn min-h-9 text-sm">Tarik</Link>
                  <form action={deleteSavingsGoal.bind(null, g.id)} className="ml-auto"><button aria-label={`Hapus ${g.name}`} className="btn size-9 px-0 text-neg"><Trash2 size={15} aria-hidden /></button></form>
                </div>
              </div>
            );
          }) : <Empty>Belum ada tujuan tabungan.</Empty>}
          <form action={saveSavingsGoal} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
            <Field label="Nama tujuan" className="col-span-2"><input name="name" required placeholder="Dana darurat" className="field" /></Field>
            <Field label="Target (Rp)"><input name="target_amount" required inputMode="numeric" placeholder="15000000" className="field" /></Field>
            <Field label="Tenggat (opsional)"><input type="date" name="deadline" className="field" /></Field>
            <button className="btn col-span-2">Tambah tujuan</button>
          </form>
        </Card>

        <Card title="Aset">
          {(assets.data ?? []).length ? (assets.data ?? []).map((a) => (
            <details key={a.id} className="border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3">
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-xs text-muted">{ASSET_KIND[a.kind as keyof typeof ASSET_KIND]}{a.valued_at ? ` · dinilai ${formatShortDate(a.valued_at, today)}` : ""}</span>
                </span>
                <b><Money amount={Number(a.current_value ?? 0)} sensitive={priv.assets} /></b>
              </summary>
              <form action={addValuation.bind(null, a.id)} className="flex flex-wrap items-end gap-2 py-2">
                <Field label="Nilai terbaru (Rp)" className="flex-1"><input name="value" inputMode="numeric" required className="field" /></Field>
                <Field label="Tanggal"><input type="date" name="valued_at" defaultValue={today} className="field" /></Field>
                <button className="btn">Perbarui</button>
                <button formAction={setAssetArchived.bind(null, a.id, true)} aria-label="Arsipkan aset" className="btn size-11 px-0"><Archive size={15} aria-hidden /></button>
              </form>
            </details>
          )) : <Empty>Belum ada aset tercatat.</Empty>}
          <form action={saveAsset} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
            <Field label="Nama aset"><input name="name" required placeholder="Emas 10 gr" className="field" /></Field>
            <Field label="Jenis">
              <select name="kind" className="field">{Object.entries(ASSET_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            <Field label="Nilai saat ini (Rp)"><input name="current_value" required inputMode="numeric" className="field" /></Field>
            <Field label="Nilai beli (opsional)"><input name="purchase_value" inputMode="numeric" className="field" /></Field>
            <button className="btn col-span-2">Tambah aset</button>
          </form>
        </Card>

        <Card title="Hutang & piutang" className="lg:col-span-2">
          <p className="text-xs text-muted">Bayar cicilan = pengeluaran yang ditautkan ke hutang. Terima pelunasan piutang = pemasukan yang ditautkan. Sisanya berkurang otomatis.</p>
          {(debts.data ?? []).length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(debts.data ?? []).map((d) => {
                const payable = d.direction === "payable";
                const p = (Number(d.paid) / Number(d.principal)) * 100;
                return (
                  <div key={d.id} className={`flex flex-col gap-2 rounded-xl p-3.5 ${payable ? "bg-[#fbf3f1] dark:bg-surface-2" : "bg-accent-soft"} ${d.status === "closed" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex flex-col">
                        <span className="text-xs font-semibold text-muted uppercase">{payable ? "Hutang" : "Piutang"}{d.status === "closed" ? " · lunas" : ""}</span>
                        <span className="font-semibold">{d.counterparty}</span>
                      </span>
                      <b className={payable ? "text-neg" : "text-pos"}><Money amount={Number(d.remaining)} sensitive={priv.debts} /></b>
                    </div>
                    <Bar pct={p} color={payable ? "var(--neg)" : "var(--pos)"} />
                    <span className="text-xs text-muted">
                      Terbayar <Money amount={Number(d.paid)} sensitive={priv.debts} /> dari <Money amount={Number(d.principal)} sensitive={priv.debts} />
                      {d.installment ? <> · cicilan <Money amount={Number(d.installment)} sensitive={priv.debts} /></> : null}
                      {d.due_day ? ` · jatuh tempo tgl ${d.due_day}` : ""}
                    </span>
                    {d.status === "open" && (
                      <div className="flex gap-2">
                        <Link href={`/keuangan/transaksi/baru?kind=${payable ? "expense" : "income"}&d=${d.id}&back=${back}`} className="btn btn-primary min-h-9 text-sm">{payable ? "Bayar" : "Terima"}</Link>
                        <form action={setDebtStatus.bind(null, d.id, "closed")}><button className="btn min-h-9 text-sm">Tandai lunas</button></form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <Empty>Tidak ada hutang atau piutang.</Empty>}
          <form action={saveDebt} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3 md:grid-cols-6">
            <Field label="Jenis"><select name="direction" className="field"><option value="payable">Hutang</option><option value="receivable">Piutang</option></select></Field>
            <Field label="Pihak" className="md:col-span-2"><input name="counterparty" required placeholder="Leasing motor / nama teman" className="field" /></Field>
            <Field label="Pokok (Rp)"><input name="principal" required inputMode="numeric" className="field" /></Field>
            <Field label="Cicilan (opsional)"><input name="installment" inputMode="numeric" className="field" /></Field>
            <Field label="Tgl jatuh tempo"><input name="due_day" type="number" min={1} max={31} className="field" /></Field>
            <button className="btn col-span-2 md:col-span-6">Tambah</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
