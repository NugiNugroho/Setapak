import { Archive, ArchiveRestore, Trash2, Eye, EyeOff } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { monthRange, shiftMonth, monthLabel } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { PageHeader, Card, Field } from "@/components/ui";
import { FinanceNav } from "@/components/finance/FinanceNav";
import {
  saveWallet, setWalletArchived, saveCategory, setCategoryArchived, saveCustomField, setCustomFieldHidden,
  deleteCustomField, saveTemplate, deleteTemplate, saveBudgets, copyBudgets,
} from "../actions";

export const metadata = { title: "Atur keuangan" };

const WALLET_KIND = { cash: "Tunai", bank: "Bank", ewallet: "E-wallet", other: "Lainnya" } as const;
const FIELD_TYPE = { text: "Teks", number: "Angka", select: "Pilihan tunggal", multiselect: "Pilihan ganda", date: "Tanggal", checkbox: "Centang" } as const;
const COLORS = ["#C2714F", "#5A7FA8", "#2F6B5E", "#7A62A8", "#B08A2E", "#2F7D4F", "#B5473A", "#8C8A84"];

export default async function AturKeuangan({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m: mp } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const m = mp && /^\d{4}-\d{2}$/.test(mp) ? mp : todayISO(profile.timezone).slice(0, 7);
  const { start } = monthRange(m);
  const [wallets, bal, cats, budgets, fields, templates] = await Promise.all([
    supabase.from("wallets").select("*").order("sort_order").order("created_at"),
    supabase.from("wallet_balances").select("wallet_id,balance"),
    supabase.from("categories").select("*").order("sort_order").order("created_at"),
    supabase.from("budgets").select("category_id,amount").eq("month", start),
    supabase.from("custom_fields").select("*").order("sort_order").order("created_at"),
    supabase.from("transaction_templates").select("*").order("sort_order").order("created_at"),
  ]);
  const balance = new Map((bal.data ?? []).map((b) => [b.wallet_id, Number(b.balance)]));
  const budget = new Map((budgets.data ?? []).map((b) => [b.category_id, Number(b.amount)]));
  const allCats = cats.data ?? [];
  const activeCats = allCats.filter((c) => !c.archived);
  const catName = new Map(allCats.map((c) => [c.id, c.name]));
  const activeWallets = (wallets.data ?? []).filter((w) => !w.archived);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Keuangan" title="Dompet, kategori & budget" />
      <FinanceNav current="atur" m={m} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Dompet & rekening">
          {(wallets.data ?? []).map((w) => (
            <details key={w.id} className={`group border-t border-line-soft pt-2 first:border-t-0 first:pt-0 ${w.archived ? "opacity-60" : ""}`}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                <span className="flex-1 font-medium">{w.name} <span className="text-xs text-muted">· {WALLET_KIND[w.kind as keyof typeof WALLET_KIND]}</span></span>
                <b className="text-sm">{formatRupiah(balance.get(w.id) ?? 0)}</b>
              </summary>
              <form action={saveWallet} className="mt-2 grid grid-cols-2 gap-2 pb-2">
                <input type="hidden" name="id" value={w.id} />
                <Field label="Nama"><input name="name" defaultValue={w.name} className="field" /></Field>
                <Field label="Jenis">
                  <select name="kind" defaultValue={w.kind} className="field">{Object.entries(WALLET_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Saldo awal" className="col-span-2"><input name="opening_balance" inputMode="numeric" defaultValue={w.opening_balance} className="field" /></Field>
                <div className="col-span-2 flex justify-between gap-2">
                  <button formAction={setWalletArchived.bind(null, w.id, !w.archived)} className="btn text-sm">
                    {w.archived ? <><ArchiveRestore size={15} aria-hidden />Aktifkan</> : <><Archive size={15} aria-hidden />Arsipkan</>}
                  </button>
                  <button className="btn btn-primary text-sm">Simpan</button>
                </div>
              </form>
            </details>
          ))}
          <form action={saveWallet} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
            <Field label="Dompet baru"><input name="name" required placeholder="mis. BCA, GoPay" className="field" /></Field>
            <Field label="Jenis">
              <select name="kind" defaultValue="bank" className="field">{Object.entries(WALLET_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            <Field label="Saldo saat ini" className="col-span-2"><input name="opening_balance" inputMode="numeric" placeholder="0" className="field" /></Field>
            <button className="btn col-span-2">Tambah dompet</button>
          </form>
        </Card>

        <Card title="Kategori">
          {(["expense", "income"] as const).map((kind) => (
            <div key={kind} className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wide text-muted uppercase">{kind === "expense" ? "Pengeluaran" : "Pemasukan"}</span>
              {allCats.filter((c) => c.kind === kind).map((c) => (
                <details key={c.id} className={c.archived ? "opacity-50" : ""}>
                  <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5">
                    {c.icon ? <span aria-hidden>{c.icon}</span> : <span className="size-2.5 rounded-full" style={{ background: c.color ?? "#8C8A84" }} />}
                    <span className="flex-1">{c.parent_id ? <span className="text-muted">{catName.get(c.parent_id)} › </span> : null}{c.name}</span>
                    {c.archived && <span className="text-xs text-muted">diarsipkan</span>}
                  </summary>
                  <form action={saveCategory} className="flex flex-wrap items-end gap-2 py-2">
                    <input type="hidden" name="id" value={c.id} />
                    <Field label="Ikon"><input name="icon" defaultValue={c.icon ?? ""} placeholder="🍜" maxLength={8} className="field w-16 text-center text-lg" /></Field>
                    <Field label="Nama" className="flex-1"><input name="name" defaultValue={c.name} className="field" /></Field>
                    <Field label="Warna"><input type="color" name="color" defaultValue={c.color ?? "#8C8A84"} className="field w-14 p-1" /></Field>
                    <button className="btn text-sm">Simpan</button>
                    <button formAction={setCategoryArchived.bind(null, c.id, !c.archived)} className="btn text-sm" aria-label={c.archived ? "Aktifkan" : "Arsipkan"}>
                      {c.archived ? <ArchiveRestore size={15} aria-hidden /> : <Archive size={15} aria-hidden />}
                    </button>
                  </form>
                </details>
              ))}
            </div>
          ))}
          <form action={saveCategory} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
            <Field label="Kategori baru"><div className="flex gap-2"><input name="icon" placeholder="🍜" maxLength={8} aria-label="Ikon (emoji)" className="field w-16 text-center text-lg" /><input name="name" required className="field" /></div></Field>
            <Field label="Jenis">
              <select name="kind" className="field"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
            </Field>
            <Field label="Induk (opsional, untuk subkategori)">
              <select name="parent_id" className="field">
                <option value="">— tidak ada —</option>
                {activeCats.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Warna">
              <select name="color" className="field">{COLORS.map((c, i) => <option key={c} value={c}>Warna {i + 1}</option>)}</select>
            </Field>
            <button className="btn col-span-2">Tambah kategori</button>
          </form>
        </Card>

        <section id="budget" className="scroll-mt-6">
          <Card title={`Budget · ${monthLabel(m)}`} aside={<form action={copyBudgets.bind(null, shiftMonth(m, -1), m)}><button className="font-semibold text-accent">Salin dari bulan lalu</button></form>}>
            <form action={saveBudgets.bind(null, m)} className="flex flex-col gap-2">
              {activeCats.filter((c) => c.kind === "expense" && !c.parent_id).map((c) => (
                <label key={c.id} className="flex items-center gap-3">
                  <span className="flex flex-1 items-center gap-2 text-sm"><span className="size-2.5 rounded-full" style={{ background: c.color ?? "#8C8A84" }} />{c.name}</span>
                  <span className="text-sm text-muted">Rp</span>
                  <input name={`b_${c.id}`} inputMode="numeric" defaultValue={budget.get(c.id) || ""} placeholder="tanpa budget" className="field w-40 text-right" />
                </label>
              ))}
              <button className="btn btn-primary mt-1 self-end">Simpan budget</button>
            </form>
          </Card>
        </section>

        <section id="field" className="scroll-mt-6">
          <Card title="Field kustom transaksi">
            <p className="text-xs text-muted">Kolom tambahan di form transaksi, mis. Metode bayar, Untuk siapa, Bisa diklaim kantor.</p>
            {(fields.data ?? []).map((f) => (
              <div key={f.id} className={`flex min-h-11 items-center gap-2 border-t border-line-soft first:border-t-0 ${f.hidden ? "opacity-50" : ""}`}>
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">{f.name}{f.required ? " *" : ""}</span>
                  <span className="text-xs text-muted">{FIELD_TYPE[f.field_type as keyof typeof FIELD_TYPE]}{f.options?.length ? `: ${f.options.join(", ")}` : ""} · {f.applies_to === "both" ? "semua" : f.applies_to === "expense" ? "pengeluaran" : "pemasukan"}</span>
                </span>
                <form action={setCustomFieldHidden.bind(null, f.id, !f.hidden)}><button aria-label={f.hidden ? "Tampilkan" : "Sembunyikan"} className="btn size-9 px-0">{f.hidden ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}</button></form>
                <form action={deleteCustomField.bind(null, f.id)}><button aria-label="Hapus field" className="btn size-9 px-0 text-neg"><Trash2 size={15} aria-hidden /></button></form>
              </div>
            ))}
            <form action={saveCustomField} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
              <Field label="Nama field"><input name="name" required placeholder="Metode bayar" className="field" /></Field>
              <Field label="Tipe">
                <select name="field_type" className="field">{Object.entries(FIELD_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Field>
              <Field label="Pilihan (untuk tipe pilihan, pisahkan koma)" className="col-span-2"><input name="options" placeholder="QRIS, Tunai, Debit" className="field" /></Field>
              <Field label="Berlaku untuk">
                <select name="applies_to" className="field"><option value="both">Semua</option><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
              </Field>
              <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="required" className="size-4 accent-[var(--accent)]" />Wajib diisi</label>
              <button className="btn col-span-2">Tambah field</button>
            </form>
          </Card>
        </section>

        <Card title="Template transaksi cepat" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(templates.data ?? []).map((t) => (
              <form key={t.id} action={deleteTemplate.bind(null, t.id)} className="flex items-center gap-1 rounded-full border border-line py-1 pr-1 pl-3 text-sm">
                {t.name}{t.defaults?.amount ? <span className="text-muted"> · {formatRupiah(t.defaults.amount)}</span> : null}
                <button aria-label={`Hapus template ${t.name}`} className="flex size-7 items-center justify-center rounded-full text-muted hover:text-neg"><Trash2 size={13} aria-hidden /></button>
              </form>
            ))}
          </div>
          <form action={saveTemplate} className="grid grid-cols-2 gap-2 border-t border-line-soft pt-3 md:grid-cols-6">
            <Field label="Nama" className="md:col-span-2"><input name="name" required placeholder="Makan siang" className="field" /></Field>
            <Field label="Jenis"><select name="kind" className="field"><option value="expense">Keluar</option><option value="income">Masuk</option></select></Field>
            <Field label="Nominal"><input name="amount" inputMode="numeric" placeholder="25000" className="field" /></Field>
            <Field label="Kategori">
              <select name="category_id" className="field"><option value="">—</option>{activeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </Field>
            <Field label="Dompet">
              <select name="wallet_id" className="field"><option value="">—</option>{activeWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </Field>
            <button className="btn col-span-2 md:col-span-6">Tambah template</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
