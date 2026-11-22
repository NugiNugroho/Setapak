"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { BUCKET } from "@/lib/media";

const KINDS = ["cover", "vision", "journal", "audio"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Membuat URL unggah bertanda tangan untuk folder milik user sendiri.
 * File diunggah langsung dari perangkat ke Supabase (tidak lewat server Vercel),
 * jadi tidak terbatas ukuran request Vercel.
 */
export async function getUploadUrl(kind: Kind, ext: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Belum masuk" };
  if (!KINDS.includes(kind)) return { error: "Jenis file tidak dikenal" };
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `${user.id}/${kind}/${crypto.randomUUID()}.${safeExt}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Gagal menyiapkan unggahan" };
  return { signedUrl: data.signedUrl, path, apikey: supabaseEnv().key };
}

/** Mencatat file sampul/lagu ke daftar media milik user. */
export async function registerMedia(kind: "cover" | "audio", path: string, meta: { title?: string; mime?: string; size?: number } = {}) {
  const { supabase, user } = await getUser();
  if (!user || !path.startsWith(`${user.id}/`)) return { error: "Path tidak valid" };
  const { count } = await supabase.from("media").select("id", { count: "exact", head: true }).eq("kind", kind);
  await supabase.from("media").insert({ kind, path, title: meta.title ?? null, mime: meta.mime ?? null, size_bytes: meta.size ?? null, sort_order: count ?? 0 });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMedia(id: string) {
  const { supabase, user } = await getUser();
  if (!user) return;
  const { data } = await supabase.from("media").select("path").eq("id", id).single();
  if (data?.path) await supabase.storage.from(BUCKET).remove([data.path]);
  await supabase.from("media").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/** Menghapus file storage berdasarkan path (untuk gambar visi/jurnal yang diganti). */
export async function removeFile(path: string | null | undefined) {
  const { supabase, user } = await getUser();
  if (!user || !path || !path.startsWith(`${user.id}/`)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
