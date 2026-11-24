import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Konfirmasi email lewat token_hash (bisa dibuka di perangkat/browser mana pun).
 * Dipakai bila template email Supabase diarahkan ke /auth/confirm.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${origin}/`);
    console.error("auth confirm:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
