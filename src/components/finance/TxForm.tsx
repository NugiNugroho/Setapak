"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { saveTransaction, deleteTransaction, type TxResult } from "@/app/(app)/keuangan/actions";
import type { Tx } from "@/lib/finance";

type Cat = { id: string; name: string; kind: "income" | "expense"; parent_id: string | null; color: string | null };
type Wallet = { id: string; name: string };
type CustomField = {
  id: string;
  name: string;
  field_type: "text" | "number" | "select" | "multiselect" | "date" | "checkbox";
  options: string[];
  applies_to: "income" | "expense" | "both";
  required: boolean;
};
type Template = { id: string; name: string; defaults: { kind?: string; amount?: number | null; category_id?: string | null; wallet_id?: string | null; note?: string | null } };

const KINDS = [
  ["expense", "Pengeluaran"],
  ["income", "Pemasukan"],
  ["transfer", "Transfer"],
] as const;

const fmt = (n: number) => (n ? n.toLocaleString("id-ID") : "");

export function TxForm({
  initial,
  categories,
  wallets,
  fields,
  templates,
  savings,
  debts,
  today,
  back,
  preset,
}: {
  initial: Tx | null;
  categories: Cat[];
  wallets: Wallet[];
  fields: CustomField[];
  templates: Template[];
  savings: { id: string; name: string }[];
  debts: { id: string; counterparty: string; direction: string }[];
  today: string;
  back: string;
  preset: { kind?: string; savings_goal_id?: string; debt_id?: string; amount?: number };
}) {
  const [state, action, pending] = useActionState<TxResult, FormData>(saveTransaction, {});
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<string>(initial?.kind ?? preset.kind ?? "expense");
  const [amount, setAmount] = useState(fmt(initial?.amount ?? preset.amount ?? 0));
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [walletId, setWalletId] = useState(initial?.wallet_id ?? wallets[0]?.id ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [link, setLink] = useState(
    initial?.savings_goal_id ? `s:${initial.savings_goal_id}` : initial?.debt_id ? `d:${initial.debt_id}` :
    preset.savings_goal_id ? `s:${preset.savings_goal_id}` : preset.debt_id ? `d:${preset.debt_id}` : "",
  );

  // Setelah "Simpan & catat lagi": kosongkan nominal & catatan, pertahankan dompet & kategori.
  useEffect(() => {
    if (state.ok) {
      setAmount("");
      setNote("");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  const cats = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);
  const parents = cats.filter((c) => !c.parent_id);
  const visibleFields = fields.filter((f) => kind !== "transfer" && (f.applies_to === "both" || f.applies_to === kind));

  function applyTemplate(t: Template) {
    const d = t.defaults;
    if (d.kind) setKind(d.kind);
    if (d.amount) setAmount(fmt(d.amount));
    if (d.category_id) setCategoryId(d.category_id);
    if (d.wallet_id) setWalletId(d.wallet_id);
    setNote(d.note ?? t.name);
  }

  const kindColor = kind === "expense" ? "text-neg" : kind === "income" ? "text-pos" : "text-ink";

  return (
    <form action={action} className="flex flex-col gap-4" key={formKey}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="back" value={back} />

      <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-3 gap-1 rounded-xl bg-sidebar p-1">
        {KINDS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => { setKind(k); setCategoryId(""); }}
            className={`min-h-10 rounded-[9px] text-sm ${kind === k ? `bg-surface font-semibold shadow-sm ${k === "expense" ? "text-neg" : k === "income" ? "text-pos" : "text-ink"}` : "text-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <label className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs text-muted">Nominal</span>
        <span className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-muted">Rp</span>
          <input
            name="amount"
            inputMode="numeric"
            autoFocus={!initial}
            required
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setAmount(digits ? Number(digits).toLocaleString("id-ID") : "");
            }}
            placeholder="0"
            className={`w-56 bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-line ${kindColor}`}
          />
        </span>
      </label>

      {templates.length > 0 && !initial && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Template cepat</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="btn shrink-0 rounded-full text-sm font-medium">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card flex flex-col divide-y divide-line-soft px-4">
        {kind !== "transfer" && (
          <Row label="Kategori">
            <select name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field border-0 bg-transparent px-0 font-semibold">
              <option value="">Tanpa kategori</option>
              {parents.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name}</option>
                  {cats.filter((c) => c.parent_id === p.id).map((c) => <option key={c.id} value={c.id}>{p.name} › {c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </Row>
        )}
        <Row label={kind === "transfer" ? "Dari dompet" : "Dompet"}>
          <select name="wallet_id" value={walletId} onChange={(e) => setWalletId(e.target.value)} className="field border-0 bg-transparent px-0 font-semibold">
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Row>
        {kind === "transfer" && (
          <Row label="Ke dompet">
            <select name="to_wallet_id" defaultValue={initial?.to_wallet_id ?? wallets.find((w) => w.id !== walletId)?.id} className="field border-0 bg-transparent px-0 font-semibold">
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Row>
        )}
        <Row label="Tanggal">
          <div className="flex gap-2">
            <input type="date" name="tx_date" defaultValue={initial?.tx_date ?? today} className="field border-0 bg-transparent px-0 font-semibold" />
            <input type="time" name="tx_time" defaultValue={initial?.tx_time?.slice(0, 5) ?? ""} aria-label="Jam (opsional)" className="field w-28 border-0 bg-transparent px-0" />
          </div>
        </Row>
        <Row label="Catatan">
          <input name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" className="field border-0 bg-transparent px-0" />
        </Row>
        <Row label="Label">
          <input name="labels" defaultValue={initial?.labels.join(", ") ?? ""} placeholder="mis. kantor, rumah" className="field border-0 bg-transparent px-0" />
        </Row>
        {kind !== "transfer" && (savings.length > 0 || debts.length > 0) && (
          <Row label="Tautkan ke">
            <select value={link} onChange={(e) => setLink(e.target.value)} className="field border-0 bg-transparent px-0">
              <option value="">Tidak ada</option>
              {savings.length > 0 && (
                <optgroup label="Tabungan (setor / tarik)">
                  {savings.map((g) => <option key={g.id} value={`s:${g.id}`}>{g.name}</option>)}
                </optgroup>
              )}
              {debts.length > 0 && (
                <optgroup label="Hutang / piutang (bayar / terima)">
                  {debts.map((d) => <option key={d.id} value={`d:${d.id}`}>{d.direction === "payable" ? "Hutang" : "Piutang"} · {d.counterparty}</option>)}
                </optgroup>
              )}
            </select>
            <input type="hidden" name="savings_goal_id" value={link.startsWith("s:") ? link.slice(2) : ""} />
            <input type="hidden" name="debt_id" value={link.startsWith("d:") ? link.slice(2) : ""} />
          </Row>
        )}
      </div>

      {visibleFields.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Field kustom</span>
            <Link href="/keuangan/atur#field" className="text-xs font-semibold text-accent">Atur field</Link>
          </div>
          <div className="card flex flex-col divide-y divide-line-soft px-4">
            {visibleFields.map((f) => <CustomInput key={f.id} field={f} value={initial?.custom_values?.[f.id]} />)}
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-neg" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-pos" role="status">Tersimpan. Catat berikutnya.</p>}

      <div className="flex flex-wrap items-center gap-2">
        {initial ? (
          <button type="button" className="btn text-neg" disabled={pending} onClick={() => confirm("Hapus transaksi ini?") && deleteTransaction(initial.id, back)}>
            Hapus
          </button>
        ) : (
          <button name="again" value="1" className="btn" disabled={pending}>Simpan &amp; catat lagi</button>
        )}
        <button className="btn btn-primary min-h-12 flex-1" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-14 items-center gap-3">
      <span className="w-24 shrink-0 text-[13px] text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

function CustomInput({ field, value }: { field: CustomField; value: unknown }) {
  const name = `cf_${field.id}`;
  const label = field.name + (field.required ? " *" : "");
  if (field.field_type === "checkbox") {
    return (
      <label className="flex min-h-14 items-center justify-between gap-3">
        <span className="text-[13px] text-muted">{label}</span>
        <input type="checkbox" name={name} defaultChecked={value === true} className="size-5 accent-[var(--accent)]" />
      </label>
    );
  }
  if (field.field_type === "select" || field.field_type === "multiselect") {
    const selected = ([] as unknown[]).concat(value ?? []);
    return (
      <fieldset className="flex min-h-14 flex-wrap items-center gap-3 py-2">
        <legend className="sr-only">{field.name}</legend>
        <span aria-hidden className="w-24 shrink-0 text-[13px] text-muted">{label}</span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {field.options.map((o) => (
            <label key={o} className="cursor-pointer">
              <input
                type={field.field_type === "select" ? "radio" : "checkbox"}
                name={name}
                value={o}
                defaultChecked={selected.includes(o)}
                required={field.required && field.field_type === "select"}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-[13px] peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {o}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <Row label={label}>
      <input
        name={name}
        type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
        defaultValue={value == null ? "" : String(value)}
        required={field.required}
        className="field border-0 bg-transparent px-0"
      />
    </Row>
  );
}
