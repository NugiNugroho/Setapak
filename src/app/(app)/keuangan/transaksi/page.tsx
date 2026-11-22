import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import { loadPrivacy, monthRange, shiftMonth, monthLabel, summarize, isOperational, TX_FIELDS, type Tx } from "@/lib/finance";
import { Money, PrivacyToggle } from "@/components/Privacy";
import { PageHeader, Empty } from "@/components/ui";
import { FinanceNav } from "@/components/finance/FinanceNav";

export const metadata = { title: "Transaksi" };

export default async function TxList({ searchParams }: { searchParams: Promise<{ m?: string; kind?: string; cat?: string; w?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const m = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const { start, next } = monthRange(m);

  let q = supabase.from("transactions").select(TX_FIELDS).gte("tx_date", start).lt("tx_date", next)
    .order("tx_date", { ascending: false }).order("tx_time", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (sp.kind) q = q.eq("kind", sp.kind);
  if (sp.cat) q = q.eq("category_id", sp.cat);
  if (sp.w) q = q.or(`wallet_id.eq.${sp.w},to_wallet_id.eq.${sp.w}`);
  if (sp.q) q = q.ilike("note", `%${sp.q}%`);

  const [priv, { data }, cats, wallets, fields] = await Promise.all([
    loadPrivacy(supabase),
    q,
    supabase.from("categories").select("id,name,kind,color,icon").order("sort_order"),
    supabase.from("wallets").select("id,name").order("sort_order"),
    supabase.from("custom_fields").select("id,name"),
  ]);
  const txs = (data ?? []) as Tx[];
  const cat = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const wal = new Map((wallets.data ?? []).map((w) => [w.id, w.name]));
  const fname = new Map((fields.data ?? []).map((f) => [f.id, f.name]));
  const sum = summarize(txs);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { m, kind: sp.kind, cat: sp.cat, w: sp.w, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/keuangan/transaksi?${p.toString()}`;
  };

  const days: [string, Tx[]][] = [];
  for (const t of txs) {
    const g = days.find(([d]) => d === t.tx_date);
    if (g) g[1].push(t);
    else days.push([t.tx_date, [t]]);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1">
            <Link href={qs({ m: shiftMonth(m, -1) })} aria-label="Bulan sebelumnya" className="rounded p-1 hover:bg-line-soft"><ChevronLeft size={16} aria-hidden /></Link>
            {monthLabel(m)}
            <Link href={qs({ m: shiftMonth(m, 1) })} aria-label="Bulan berikutnya" className="rounded p-1 hover:bg-line-soft"><ChevronRight size={16} aria-hidden /></Link>
          </span>
        }
        title="Transaksi"
        actions={<><PrivacyToggle /><Link href={`/keuangan/transaksi/baru?back=${encodeURIComponent(qs({}))}`} className="btn btn-primary"><Plus size={16} aria-hidden />Transaksi</Link></>}
      />
      <FinanceNav current="transaksi" m={m} />

      <form className="flex flex-wrap gap-2" action="/keuangan/transaksi">
        <input type="hidden" name="m" value={m} />
        <label className="min-w-[160px] flex-[2]"><span className="sr-only">Cari catatan</span><input name="q" defaultValue={sp.q} placeholder="Cari catatan…" className="field" /></label>
        <label className="flex-1"><span className="sr-only">Jenis</span>
          <select name="kind" defaultValue={sp.kind ?? ""} className="field">
            <option value="">Semua jenis</option><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option><option value="transfer">Transfer</option>
          </select></label>
        <label className="flex-1"><span className="sr-only">Kategori</span>
          <select name="cat" defaultValue={sp.cat ?? ""} className="field">
            <option value="">Semua kategori</option>
            {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="flex-1"><span className="sr-only">Dompet</span>
          <select name="w" defaultValue={sp.w ?? ""} className="field">
            <option value="">Semua dompet</option>
            {(wallets.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></label>
        <button className="btn">Terapkan</button>
      </form>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>Masuk <b className="text-pos"><Money amount={sum.income} sensitive={priv.transactions} /></b></span>
        <span>Keluar <b className="text-neg"><Money amount={sum.expense} sensitive={priv.transactions} /></b></span>
        <span>Selisih <b><Money amount={sum.net} sensitive={priv.transactions} sign /></b></span>
        {sum.set_aside > 0 && <span className="text-muted">Disisihkan <Money amount={sum.set_aside} sensitive={priv.transactions} /></span>}
      </div>

      {days.length ? days.map(([d, list]) => (
        <section key={d} aria-label={d} className="flex flex-col gap-1.5">
          <h2 className="text-xs font-bold tracking-wide text-muted uppercase">{formatShortDate(d, today)}</h2>
          <div className="card px-4">
            {list.map((t) => {
              const c = cat.get(t.category_id ?? "");
              const extras = Object.entries(t.custom_values ?? {}).map(([k, v]) => `${fname.get(k) ?? "?"}: ${v === true ? "Ya" : ([] as unknown[]).concat(v).join(", ")}`);
              return (
                <Link key={t.id} href={`/keuangan/transaksi/${t.id}`} className="flex min-h-14 items-center gap-3 border-t border-line-soft py-2 first:border-t-0">
                  {c?.icon && t.kind !== "transfer" ? <span aria-hidden className="w-5 shrink-0 text-center">{c.icon}</span> : <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.kind === "transfer" ? "#BDB8AD" : c?.color ?? "#BDB8AD" }} />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{t.note || (t.kind === "transfer" ? "Transfer" : c?.name ?? "Tanpa kategori")}</span>
                    <span className="truncate text-xs text-muted">
                      {t.kind === "transfer" ? `${wal.get(t.wallet_id)} → ${wal.get(t.to_wallet_id ?? "")}` : [c?.name, wal.get(t.wallet_id), ...extras, ...t.labels.map((l) => `#${l}`)].filter(Boolean).join(" · ")}
                      {!isOperational(t) && t.kind !== "transfer" && " · disisihkan"}
                    </span>
                  </span>
                  <b className={`shrink-0 ${t.kind === "income" ? "text-pos" : t.kind === "transfer" ? "text-muted" : ""}`}>
                    <Money amount={t.kind === "expense" ? -t.amount : t.amount} sensitive={priv.transactions} sign={t.kind !== "transfer"} />
                  </b>
                </Link>
              );
            })}
          </div>
        </section>
      )) : <Empty>Tidak ada transaksi yang cocok.</Empty>}
    </div>
  );
}
