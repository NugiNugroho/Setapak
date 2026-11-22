"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/finance";

async function ctx() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Belum masuk");
  return supabase;
}
const done = () => revalidatePath("/", "layout");
const s = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

// ---------------------------------------------------------------- Transaksi

export type TxResult = { error?: string; ok?: boolean };

export async function saveTransaction(_: TxResult, f: FormData): Promise<TxResult> {
  const supabase = await ctx();
  const id = s(f, "id");
  const kind = s(f, "kind") as "income" | "expense" | "transfer";
  const amount = parseAmount(String(f.get("amount") ?? ""));
  if (!amount || amount <= 0) return { error: "Nominal belum diisi." };
  const wallet_id = s(f, "wallet_id");
  if (!wallet_id) return { error: "Pilih dompet." };
  const to_wallet_id = kind === "transfer" ? s(f, "to_wallet_id") : null;
  if (kind === "transfer" && (!to_wallet_id || to_wallet_id === wallet_id))
    return { error: "Pilih dompet tujuan yang berbeda." };

  // Field kustom: input bernama cf_<id>, checkbox bernilai "on".
  const custom_values: Record<string, unknown> = {};
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("cf_")) continue;
    const key = k.slice(3);
    const val = String(v).trim();
    if (val === "") continue;
    if (custom_values[key] !== undefined) {
      custom_values[key] = ([] as unknown[]).concat(custom_values[key], val);
    } else custom_values[key] = val === "on" ? true : val;
  }

  const row = {
    kind,
    amount,
    tx_date: s(f, "tx_date") ?? new Date().toISOString().slice(0, 10),
    tx_time: s(f, "tx_time"),
    wallet_id,
    to_wallet_id,
    category_id: kind === "transfer" ? null : s(f, "category_id"),
    note: s(f, "note"),
    labels: String(f.get("labels") ?? "")
      .split(",")
      .map((l) => l.trim().replace(/^#/, "").toLowerCase())
      .filter(Boolean),
    custom_values,
    savings_goal_id: kind === "transfer" ? null : s(f, "savings_goal_id"),
    debt_id: kind === "transfer" ? null : s(f, "debt_id"),
  };

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);
  if (error) return { error: error.message };
  done();
  if (f.get("again") === "1") return { ok: true };
  redirect(String(f.get("back") ?? "/keuangan"));
}

export async function deleteTransaction(id: string, back = "/keuangan/transaksi") {
  const supabase = await ctx();
  await supabase.from("transactions").delete().eq("id", id);
  done();
  redirect(back);
}

// ---------------------------------------------------------------- Dompet & kategori

export async function saveWallet(f: FormData) {
  const supabase = await ctx();
  const id = s(f, "id");
  const row = {
    name: s(f, "name") ?? "Dompet",
    kind: s(f, "kind") ?? "cash",
    opening_balance: parseAmount(String(f.get("opening_balance") ?? "0")),
  };
  if (id) await supabase.from("wallets").update(row).eq("id", id);
  else await supabase.from("wallets").insert(row);
  done();
}

export async function setWalletArchived(id: string, archived: boolean) {
  const supabase = await ctx();
  await supabase.from("wallets").update({ archived }).eq("id", id);
  done();
}

export async function saveCategory(f: FormData) {
  const supabase = await ctx();
  const id = s(f, "id");
  const row = {
    name: s(f, "name") ?? "Kategori",
    kind: s(f, "kind") ?? "expense",
    color: s(f, "color") ?? "#8C8A84",
    parent_id: s(f, "parent_id"),
  };
  if (id) await supabase.from("categories").update({ name: row.name, color: row.color }).eq("id", id);
  else await supabase.from("categories").insert(row);
  done();
}

export async function setCategoryArchived(id: string, archived: boolean) {
  const supabase = await ctx();
  await supabase.from("categories").update({ archived }).eq("id", id);
  done();
}

// ---------------------------------------------------------------- Field kustom & template

export async function saveCustomField(f: FormData) {
  const supabase = await ctx();
  const type = s(f, "field_type") ?? "text";
  const options = String(f.get("options") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  await supabase.from("custom_fields").insert({
    name: s(f, "name") ?? "Field",
    field_type: type,
    options,
    applies_to: s(f, "applies_to") ?? "both",
    required: f.get("required") === "on",
  });
  done();
}

export async function setCustomFieldHidden(id: string, hidden: boolean) {
  const supabase = await ctx();
  await supabase.from("custom_fields").update({ hidden }).eq("id", id);
  done();
}

export async function deleteCustomField(id: string) {
  const supabase = await ctx();
  await supabase.from("custom_fields").delete().eq("id", id);
  done();
}

export async function saveTemplate(f: FormData) {
  const supabase = await ctx();
  await supabase.from("transaction_templates").insert({
    name: s(f, "name") ?? "Template",
    defaults: {
      kind: s(f, "kind") ?? "expense",
      amount: parseAmount(String(f.get("amount") ?? "0")) || null,
      category_id: s(f, "category_id"),
      wallet_id: s(f, "wallet_id"),
      note: s(f, "note"),
    },
  });
  done();
}

export async function deleteTemplate(id: string) {
  const supabase = await ctx();
  await supabase.from("transaction_templates").delete().eq("id", id);
  done();
}

// ---------------------------------------------------------------- Budget

export async function saveBudgets(month: string, f: FormData) {
  const supabase = await ctx();
  const monthDate = `${month}-01`;
  const upserts: { category_id: string; month: string; amount: number }[] = [];
  const removes: string[] = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("b_")) continue;
    const amount = parseAmount(String(v));
    if (amount > 0) upserts.push({ category_id: k.slice(2), month: monthDate, amount });
    else removes.push(k.slice(2));
  }
  if (upserts.length) {
    const { user } = await getUser();
    await supabase
      .from("budgets")
      .upsert(upserts.map((u) => ({ ...u, user_id: user!.id })), { onConflict: "user_id,category_id,month" });
  }
  if (removes.length) await supabase.from("budgets").delete().eq("month", monthDate).in("category_id", removes);
  done();
}

export async function copyBudgets(fromMonth: string, toMonth: string) {
  const supabase = await ctx();
  const { user } = await getUser();
  const { data } = await supabase.from("budgets").select("category_id,amount,rollover").eq("month", `${fromMonth}-01`);
  if (data?.length)
    await supabase
      .from("budgets")
      .upsert(data.map((b) => ({ ...b, month: `${toMonth}-01`, user_id: user!.id })), { onConflict: "user_id,category_id,month" });
  done();
}

// ---------------------------------------------------------------- Tabungan, aset, hutang

export async function saveSavingsGoal(f: FormData) {
  const supabase = await ctx();
  const target = parseAmount(String(f.get("target_amount") ?? "0"));
  if (!target) return;
  await supabase.from("savings_goals").insert({
    name: s(f, "name") ?? "Tabungan",
    target_amount: target,
    deadline: s(f, "deadline"),
  });
  done();
}

export async function deleteSavingsGoal(id: string) {
  const supabase = await ctx();
  await supabase.from("savings_goals").delete().eq("id", id);
  done();
}

export async function saveAsset(f: FormData) {
  const supabase = await ctx();
  const { data } = await supabase
    .from("assets")
    .insert({
      name: s(f, "name") ?? "Aset",
      kind: s(f, "kind") ?? "other",
      purchase_value: parseAmount(String(f.get("purchase_value") ?? "0")) || null,
      purchase_date: s(f, "purchase_date"),
    })
    .select("id")
    .single();
  const value = parseAmount(String(f.get("current_value") ?? "0"));
  if (data && value) await supabase.from("asset_valuations").insert({ asset_id: data.id, value });
  done();
}

export async function addValuation(assetId: string, f: FormData) {
  const supabase = await ctx();
  const value = parseAmount(String(f.get("value") ?? "0"));
  if (!value) return;
  await supabase.from("asset_valuations").insert({ asset_id: assetId, value, valued_at: s(f, "valued_at") ?? undefined });
  done();
}

export async function setAssetArchived(id: string, archived: boolean) {
  const supabase = await ctx();
  await supabase.from("assets").update({ archived }).eq("id", id);
  done();
}

export async function saveDebt(f: FormData) {
  const supabase = await ctx();
  const principal = parseAmount(String(f.get("principal") ?? "0"));
  if (!principal) return;
  const due = Number(s(f, "due_day") ?? 0);
  await supabase.from("debts").insert({
    direction: s(f, "direction") ?? "payable",
    counterparty: s(f, "counterparty") ?? "-",
    principal,
    installment: parseAmount(String(f.get("installment") ?? "0")) || null,
    due_day: due >= 1 && due <= 31 ? due : null,
    note: s(f, "note"),
  });
  done();
}

export async function setDebtStatus(id: string, status: "open" | "closed") {
  const supabase = await ctx();
  await supabase.from("debts").update({ status }).eq("id", id);
  done();
}
