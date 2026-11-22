import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Download, Lock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import {
  loadPrivacy, monthRange, shiftMonth, monthLabel, summarize, isOperational, TX_FIELDS, type Tx,
} from "@/lib/finance";
import { PrivacyToggle, Money } from "@/components/Privacy";
import { PageHeader, Card, Bar, Empty } from "@/components/ui";
import { FinanceNav } from "@/components/finance/FinanceNav";

export const metadata = { title: "Keuangan" };

export default async function KeuanganPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const thisMonth = today.slice(0, 7);
  const { m: mParam } = await searchParams;
  const m = mParam && /^\d{4}-\d{2}$/.test(mParam) ? mParam : thisMonth;
  const { start, next } = monthRange(m);
  const sixBack = monthRange(shiftMonth(m, -5)).start;

  const [priv, walletsRes, balRes, catRes, budRes, txRes, savRes, debtRes, assetRes, snapRes] = await Promise.all([
    loadPrivacy(supabase),
    supabase.from("wallets").select("id,name,kind,archived").order("sort_order").order("created_at"),
    supabase.from("wallet_balances").select("wallet_id,balance"),
    supabase.from("categories").select("id,name,kind,color").order("sort_order"),
    supabase.from("budgets").select("category_id,amount").eq("month", start),
    supabase.from("transactions").select(TX_FIELDS).gte("tx_date", sixBack).lt("tx_date", next).order("tx_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("savings_progress").select("*").order("created_at"),
    supabase.from("debt_progress").select("*").eq("status", "open").order("created_at"),
    supabase.from("asset_latest").select("*").eq("archived", false),
    supabase.from("net_worth_snapshots").select("month,net_worth").order("month", { ascending: false }).limit(12),
  ]);

  const wallets = (walletsRes.data ?? []).filter((w) => !w.archived);
  const balance = new Map((balRes.data ?? []).map((b) => [b.wallet_id, Number(b.balance)]));
  const cats = new Map((catRes.data ?? []).map((c) => [c.id, c]));
  const walletName = new Map((walletsRes.data ?? []).map((w) => [w.id, w.name]));
  const allTx = (txRes.data ?? []) as Tx[];
  const monthTx = allTx.filter((t) => t.tx_date >= start && t.tx_date < next);
  const sum = summarize(monthTx);
  const prev = summarize(allTx.filter((t) => t.tx_date.slice(0, 7) === shiftMonth(m, -1)));

  // Arus kas 6 bulan
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(m, i - 5));
  const flow = months.map((mm) => ({ m: mm, ...summarize(allTx.filter((t) => t.tx_date.slice(0, 7) === mm)) }));
  const flowMax = Math.max(1, ...flow.flatMap((f) => [f.income, f.expense]));

  // Pengeluaran per kategori vs budget
  const spent = new Map<string, number>();
  for (const t of monthTx) if (t.kind === "expense" && isOperational(t)) spent.set(t.category_id ?? "-", (spent.get(t.category_id ?? "-") ?? 0) + t.amount);
  const budget = new Map((budRes.data ?? []).map((b) => [b.category_id, Number(b.amount)]));
  const catRows = Array.from(new Set([...spent.keys(), ...budget.keys()]))
    .map((id) => ({ id, name: cats.get(id)?.name ?? "Tanpa kategori", color: cats.get(id)?.color ?? "#8C8A84", spent: spent.get(id) ?? 0, budget: budget.get(id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent);
  const totalBudget = [...budget.values()].reduce((a, b) => a + b, 0);
  const budgetSpent = catRows.filter((r) => r.budget).reduce((a, r) => a + r.spent, 0);

  // Posisi kekayaan
  const walletTotal = wallets.reduce((a, w) => a + (balance.get(w.id) ?? 0), 0);
  const savings = savRes.data ?? [];
  const savingsTotal = savings.reduce((a, g) => a + Number(g.saved), 0);
  const assets = assetRes.data ?? [];
  const assetTotal = assets.reduce((a, x) => a + Number(x.current_value ?? 0), 0);
  const debts = debtRes.data ?? [];
  const payable = debts.filter((d) => d.direction === "payable").reduce((a, d) => a + Number(d.remaining), 0);
  const receivable = debts.filter((d) => d.direction === "receivable").reduce((a, d) => a + Number(d.remaining), 0);
  const netWorth = walletTotal + savingsTotal + assetTotal + receivable - payable;

  // Simpan snapshot net worth bulan berjalan (untuk grafik tren).
  if (m === thisMonth) {
    await supabase.from("net_worth_snapshots").upsert(
      { user_id: profile.id, month: start, assets_total: walletTotal + savingsTotal + assetTotal + receivable, debts_total: payable, net_worth: netWorth },
      { onConflict: "user_id,month" },
    );
  }
  const prevSnap = (snapRes.data ?? []).find((s) => s.month < start);

  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1">
            <Link href={`/keuangan?m=${shiftMonth(m, -1)}`} aria-label="Bulan sebelumnya" className="rounded p-1 hover:bg-line-soft"><ChevronLeft size={16} aria-hidden /></Link>
            {monthLabel(m)}
            {m < thisMonth && <Link href={`/keuangan?m=${shiftMonth(m, 1)}`} aria-label="Bulan berikutnya" className="rounded p-1 hover:bg-line-soft"><ChevronRight size={16} aria-hidden /></Link>}
          </span>
        }
        title="Keuangan"
        actions={
          <>
            <PrivacyToggle withLabel />
            <a href={`/keuangan/export?m=${m}`} className="btn"><Download size={16} aria-hidden />CSV</a>
            <Link href="/keuangan/transaksi/baru" className="btn btn-primary"><Plus size={16} aria-hidden />Transaksi</Link>
          </>
        }
      />
      <FinanceNav current="ringkasan" m={m} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pemasukan" icon={<ArrowDownLeft size={14} className="text-pos" aria-hidden />} value={<Money amount={sum.income} sensitive={priv.transactions} />} note={prev.income ? `${pct(sum.income, prev.income) >= 0 ? "+" : ""}${pct(sum.income, prev.income)}% dari bulan lalu` : ""} />
        <Kpi label="Pengeluaran" icon={<ArrowUpRight size={14} className="text-neg" aria-hidden />} value={<Money amount={sum.expense} sensitive={priv.transactions} />} note={prev.expense ? `${pct(sum.expense, prev.expense) >= 0 ? "+" : ""}${pct(sum.expense, prev.expense)}% dari bulan lalu` : ""} />
        <Kpi label="Selisih" value={<Money amount={sum.net} sensitive={priv.transactions} sign />} note={sum.set_aside ? <>Disisihkan ke tabungan/cicilan: <Money amount={sum.set_aside} sensitive={priv.transactions} /></> : "Pemasukan − pengeluaran"} />
        <Kpi label="Savings rate" value={`${sum.income ? sum.savingsRate : 0}%`} note={<Bar pct={sum.savingsRate} />} />
      </div>

      <div className="flex flex-wrap gap-5">
        <Card title="Arus kas · 6 bulan" className="min-w-0 grow-[2] basis-[460px]"
          aside={<span className="flex gap-3"><Legend color="var(--accent)" label="Masuk" /><Legend color="#D9A38A" label="Keluar" /></span>}>
          <div className="flex h-48 items-end justify-around gap-2 border-b border-line pt-2">
            {flow.map((f) => (
              <div key={f.m} className="flex flex-col items-center gap-2">
                <div className="flex h-40 items-end gap-1" title={`${monthLabel(f.m)}: masuk ${f.income.toLocaleString("id-ID")}, keluar ${f.expense.toLocaleString("id-ID")}`}>
                  <span className="w-3.5 rounded-t sm:w-5" style={{ height: `${(f.income / flowMax) * 100}%`, background: "var(--accent)" }} />
                  <span className="w-3.5 rounded-t sm:w-5" style={{ height: `${(f.expense / flowMax) * 100}%`, background: f.m === m ? "#C2714F" : "#D9A38A" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="-mt-1 flex justify-around text-xs text-muted">
            {flow.map((f) => <span key={f.m} className={f.m === m ? "font-bold text-ink" : ""}>{monthLabel(f.m, true)}</span>)}
          </div>
        </Card>

        <Card title="Posisi kekayaan" className="grow basis-[300px]"
          aside={priv.net_worth && <span className="flex items-center gap-1"><Lock size={12} aria-hidden />ketuk ikon mata</span>}>
          <div className="flex flex-col gap-1 rounded-xl bg-accent-soft p-4">
            <span className="text-xs text-muted">Net worth</span>
            <span className="text-2xl font-bold tracking-tight"><Money amount={netWorth} sensitive={priv.net_worth} /></span>
            {prevSnap && <span className="text-xs text-pos"><Money amount={netWorth - Number(prevSnap.net_worth)} sensitive={priv.net_worth} sign /> dari bulan lalu</span>}
          </div>
          <dl className="flex flex-col text-sm">
            <Row label="Saldo dompet" value={<Money amount={walletTotal} sensitive={priv.wallets} />} />
            <Row label="Tabungan" value={<Money amount={savingsTotal} sensitive={priv.savings} />} />
            <Row label="Aset" value={<Money amount={assetTotal} sensitive={priv.assets} />} />
            <Row label="Piutang" value={<Money amount={receivable} sensitive={priv.debts} />} />
            <Row label="Hutang" value={<span className="text-neg"><Money amount={payable} sensitive={priv.debts} /></span>} last />
          </dl>
        </Card>
      </div>

      <div className="flex flex-wrap gap-5">
        <Card title="Budget vs realisasi" className="min-w-0 grow-[1.4] basis-[420px]"
          aside={<Link href={`/keuangan/atur?m=${m}#budget`} className="font-semibold text-accent">Atur budget</Link>}>
          {totalBudget > 0 && (
            <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-3 text-sm">
              <div className="flex justify-between"><span>Sisa budget</span><b><Money amount={totalBudget - budgetSpent} sensitive={priv.transactions} /></b></div>
              <Bar pct={(budgetSpent / totalBudget) * 100} color={budgetSpent > totalBudget ? "var(--neg)" : "var(--accent)"} />
            </div>
          )}
          {catRows.length ? catRows.map((r) => {
            const p = r.budget ? (r.spent / r.budget) * 100 : 0;
            const color = !r.budget ? "#BDB8AD" : p > 100 ? "var(--neg)" : p >= 80 ? "#C9862B" : "var(--accent)";
            return (
              <div key={r.id} className="flex flex-col gap-1.5 py-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium"><span className="size-2 rounded-full" style={{ background: r.color }} />{r.name}</span>
                  <span><b><Money amount={r.spent} sensitive={priv.transactions} /></b>{r.budget ? <span className="text-muted"> / <Money amount={r.budget} sensitive={priv.transactions} /></span> : null}</span>
                </div>
                <Bar pct={r.budget ? p : 100} color={color} />
                {r.budget > 0 && <span className={`text-xs ${p > 100 ? "text-neg" : p >= 80 ? "text-warn" : "text-muted"}`}>{p > 100 ? "Lewat budget" : `${Math.round(p)}% terpakai`}</span>}
              </div>
            );
          }) : <Empty>Belum ada pengeluaran bulan ini.</Empty>}
        </Card>

        <div className="flex grow basis-[320px] flex-col gap-5">
          <Card title="Tujuan tabungan" aside={<Link href="/keuangan/kekayaan" className="font-semibold text-accent">Kelola</Link>}>
            {savings.length ? savings.map((g) => {
              const p = (Number(g.saved) / Number(g.target_amount)) * 100;
              return (
                <div key={g.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm"><span className="font-medium">{g.name}</span><b>{Math.round(p)}%</b></div>
                  <Bar pct={p} />
                  <span className="text-xs text-muted"><Money amount={Number(g.saved)} sensitive={priv.savings} /> dari <Money amount={Number(g.target_amount)} sensitive={priv.savings} />{g.deadline ? ` · target ${formatShortDate(g.deadline)}` : ""}</span>
                </div>
              );
            }) : <Empty>Belum ada tujuan tabungan.</Empty>}
          </Card>
          <Card title="Dompet">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center justify-between border-t border-line-soft pt-2 text-sm first:border-t-0 first:pt-0">
                <span className="font-medium">{w.name}</span>
                <b><Money amount={balance.get(w.id) ?? 0} sensitive={priv.wallets} /></b>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Card title="Transaksi terbaru" aside={<Link href={`/keuangan/transaksi?m=${m}`} className="font-semibold text-accent">Lihat semua</Link>}>
        {monthTx.length ? (
          <div className="flex flex-col">
            {monthTx.slice(0, 8).map((t) => (
              <Link key={t.id} href={`/keuangan/transaksi/${t.id}`} className="flex min-h-14 items-center gap-3 border-t border-line-soft first:border-t-0 hover:bg-surface-2">
                <span className="w-14 shrink-0 text-xs text-muted">{formatShortDate(t.tx_date, today)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{t.note || (t.kind === "transfer" ? "Transfer" : cats.get(t.category_id ?? "")?.name ?? "Tanpa kategori")}</span>
                  <span className="truncate text-xs text-muted">
                    {t.kind === "transfer" ? `${walletName.get(t.wallet_id)} → ${walletName.get(t.to_wallet_id ?? "")}` : `${cats.get(t.category_id ?? "")?.name ?? "—"} · ${walletName.get(t.wallet_id) ?? ""}`}
                  </span>
                </span>
                <b className={t.kind === "income" ? "text-pos" : t.kind === "transfer" ? "text-muted" : ""}>
                  <Money amount={t.kind === "expense" ? -t.amount : t.amount} sensitive={priv.transactions} sign={t.kind !== "transfer"} />
                </b>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>Belum ada transaksi di {monthLabel(m)}. <Link href="/keuangan/transaksi/baru" className="font-semibold text-accent">Catat yang pertama</Link></Empty>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, note, icon }: { label: string; value: React.ReactNode; note?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-1.5 px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-xs text-muted">{icon}{label}</span>
      <span className="text-lg font-bold tracking-tight md:text-[22px]">{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: color }} />{label}</span>;
}
