import type { SupabaseClient } from "@supabase/supabase-js";

/** Data pendukung form transaksi. */
export async function loadTxFormData(supabase: SupabaseClient) {
  const [cats, wallets, fields, templates, savings, debts] = await Promise.all([
    supabase.from("categories").select("id,name,kind,parent_id,color").eq("archived", false).order("sort_order").order("created_at"),
    supabase.from("wallets").select("id,name").eq("archived", false).order("sort_order").order("created_at"),
    supabase.from("custom_fields").select("id,name,field_type,options,applies_to,required").eq("hidden", false).order("sort_order").order("created_at"),
    supabase.from("transaction_templates").select("id,name,defaults").order("sort_order").order("created_at"),
    supabase.from("savings_goals").select("id,name").order("created_at"),
    supabase.from("debts").select("id,counterparty,direction").eq("status", "open").order("created_at"),
  ]);
  return {
    categories: cats.data ?? [],
    wallets: wallets.data ?? [],
    fields: fields.data ?? [],
    templates: templates.data ?? [],
    savings: savings.data ?? [],
    debts: debts.data ?? [],
  };
}
