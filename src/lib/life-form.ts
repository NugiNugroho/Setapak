import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadHabitFormOptions(supabase: SupabaseClient) {
  const [ids, stacks, tracks, areas] = await Promise.all([
    supabase.from("identities").select("id,statement").eq("archived", false).order("sort_order").order("created_at"),
    supabase.from("habit_stacks").select("id,name,anchor").order("sort_order").order("created_at"),
    supabase.from("tracks").select("id,name").eq("archived", false).order("created_at"),
    supabase.from("life_areas").select("id,name").order("sort_order"),
  ]);
  return {
    identities: (ids.data ?? []).map((i) => ({ id: i.id, label: i.statement })),
    stacks: stacks.data ?? [],
    tracks: (tracks.data ?? []).map((t) => ({ id: t.id, label: t.name })),
    areas: (areas.data ?? []).map((a) => ({ id: a.id, label: a.name })),
  };
}
