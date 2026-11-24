"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export type AuthState = { error?: string; message?: string };

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Email belum dikonfirmasi. Buka tautan di email dari Setapak dulu." };
    return { error: "Email atau kata sandi salah." };
  }
  redirect("/");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const name = String(form.get("name") ?? "").trim();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    options: {
      data: name ? { full_name: name } : undefined,
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });
  if (error) return { error: /registered|exists/i.test(error.message) ? "Email ini sudah terdaftar. Pilih tab Masuk." : error.message };
  // Supabase tidak memberi tahu bila email sudah terdaftar (identities kosong).
  if (data.user && data.user.identities?.length === 0) return { error: "Email ini sudah terdaftar. Pilih tab Masuk." };
  if (!data.session) return { message: "Cek email untuk konfirmasi akun. Setelah mengetuk tautannya, kamu langsung masuk." };
  redirect("/");
}

/**
 * Satu action untuk dua mode. Mode dibaca dari isian tersembunyi supaya
 * tombol "Masuk" tidak pernah tanpa sengaja menjalankan pendaftaran.
 */
export async function authAction(prev: AuthState, form: FormData): Promise<AuthState> {
  return form.get("mode") === "daftar" ? signUp(prev, form) : signIn(prev, form);
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
