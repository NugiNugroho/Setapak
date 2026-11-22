import { getUser } from "@/lib/supabase/server";
import { monthRange, TX_FIELDS, type Tx } from "@/lib/finance";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const m = new URL(request.url).searchParams.get("m");
  let q = supabase.from("transactions").select(TX_FIELDS).order("tx_date");
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const { start, next } = monthRange(m);
    q = q.gte("tx_date", start).lt("tx_date", next);
  }
  const [{ data }, cats, wallets, fields] = await Promise.all([
    q,
    supabase.from("categories").select("id,name"),
    supabase.from("wallets").select("id,name"),
    supabase.from("custom_fields").select("id,name").order("sort_order"),
  ]);
  const cat = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
  const wal = new Map((wallets.data ?? []).map((w) => [w.id, w.name]));
  const fl = fields.data ?? [];
  const KIND = { income: "Pemasukan", expense: "Pengeluaran", transfer: "Transfer" } as const;
  const header = ["Tanggal", "Jam", "Jenis", "Nominal", "Kategori", "Dompet", "Dompet tujuan", "Catatan", "Label", ...fl.map((f) => f.name)];
  const rows = ((data ?? []) as Tx[]).map((t) => [
    t.tx_date, t.tx_time?.slice(0, 5) ?? "", KIND[t.kind], t.amount, cat.get(t.category_id ?? "") ?? "", wal.get(t.wallet_id) ?? "",
    wal.get(t.to_wallet_id ?? "") ?? "", t.note ?? "", t.labels.join(" "),
    ...fl.map((f) => { const v = t.custom_values?.[f.id]; return v === true ? "Ya" : v == null ? "" : ([] as unknown[]).concat(v).join(" | "); }),
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="setapak-transaksi-${m ?? "semua"}.csv"`,
    },
  });
}
