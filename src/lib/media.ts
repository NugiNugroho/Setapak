import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "media";

/** URL bertanda tangan (berlaku 1 jam) untuk banyak path sekaligus. */
export async function signedUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const list = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const map = new Map<string, string>();
  if (!list.length) return map;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  return map;
}
