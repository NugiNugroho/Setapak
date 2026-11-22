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
  if (error) return { error: "Email atau kata sandi salah." };
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
  if (error) return { error: error.message };
  if (!data.session) return { message: "Cek email untuk konfirmasi akun, lalu masuk." };
  redirect("/");
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
