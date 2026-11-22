import type { SupabaseClient } from "@supabase/supabase-js";

export type PrivacySection = "transactions" | "wallets" | "savings" | "assets" | "debts" | "net_worth";
export type PrivacyMap = Record<PrivacySection, boolean>; // true = nominal disembunyikan

const DEFAULT_PRIVACY: PrivacyMap = {
  transactions: false,
  wallets: false,
  savings: true,
  assets: true,
  debts: true,
  net_worth: true,
};

export async function loadPrivacy(supabase: SupabaseClient): Promise<PrivacyMap> {
  const { data } = await supabase.from("privacy_settings").select("section,mode");
  const map = { ...DEFAULT_PRIVACY };
  for (const r of data ?? []) map[r.section as PrivacySection] = r.mode !== "visible";
  return map;
}

/** "2026-11" dari tanggal ISO. */
export const monthOf = (iso: string) => iso.slice(0, 7);

export function monthRange(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const start = `${m}-01`;
  const next = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return { start, next };
}

export function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const monthLabel = (m: string, short = false) => {
  const [y, mo] = m.split("-").map(Number);
  return short ? BULAN[mo - 1].slice(0, 3) : `${BULAN[mo - 1]} ${y}`;
};

export type Tx = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  tx_date: string;
  tx_time: string | null;
  wallet_id: string;
  to_wallet_id: string | null;
  category_id: string | null;
  note: string | null;
  labels: string[];
  custom_values: Record<string, unknown>;
  savings_goal_id: string | null;
  debt_id: string | null;
};

/**
 * Transaksi yang bertaut ke tabungan atau hutang/piutang tidak dihitung sebagai
 * pemasukan/pengeluaran operasional; ditampilkan terpisah sebagai "disisihkan".
 */
export const isOperational = (t: Pick<Tx, "savings_goal_id" | "debt_id" | "kind">) =>
  t.kind !== "transfer" && !t.savings_goal_id && !t.debt_id;

export function summarize(txs: Tx[]) {
  let income = 0, expense = 0, set_aside = 0;
  for (const t of txs) {
    if (t.kind === "transfer") continue;
    if (!isOperational(t)) {
      if (t.kind === "expense") set_aside += t.amount;
      continue;
    }
    if (t.kind === "income") income += t.amount;
    else expense += t.amount;
  }
  const net = income - expense;
  return { income, expense, net, set_aside, savingsRate: income > 0 ? Math.round(((net - 0) / income) * 100) : 0 };
}

export const TX_FIELDS =
  "id,kind,amount,tx_date,tx_time,wallet_id,to_wallet_id,category_id,note,labels,custom_values,savings_goal_id,debt_id";

/** Parse "Rp 1.250.000" / "1250000" / "1,25jt" → 1250000 */
export function parseAmount(raw: string): number {
  const s = raw.toLowerCase().replace(/rp|\s/g, "");
  const jt = s.match(/^([\d.,]+)(jt|juta)$/);
  if (jt) return Math.round(parseFloat(jt[1].replace(",", ".")) * 1_000_000);
  const rb = s.match(/^([\d.,]+)(rb|ribu|k)$/);
  if (rb) return Math.round(parseFloat(rb[1].replace(",", ".")) * 1_000);
  return Number(s.replace(/[.,]/g, "")) || 0;
}
