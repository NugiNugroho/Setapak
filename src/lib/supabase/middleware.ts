import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/auth", "/manifest.webmanifest", "/sw.js", "/icons", "/brand", "/music", "/offline", "/api/push/cron"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims memverifikasi JWT secara lokal dan tetap menyegarkan sesi bila perlu.
  let user: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ?? null;
  } catch {
    // Token rusak/kedaluwarsa atau sesi dari project Supabase lama: anggap belum masuk.
    user = null;
  }

  const path = request.nextUrl.pathname;
  const qs = request.nextUrl.searchParams;

  // Tautan dari email Supabase kadang mendarat di halaman lain (mis. "/?code=…"
  // bila Redirect URL belum terdaftar). Arahkan ke penangan yang benar.
  if (!path.startsWith("/auth/")) {
    const to = request.nextUrl.clone();
    if (qs.get("code")) {
      to.pathname = "/auth/callback";
      to.search = `?code=${encodeURIComponent(qs.get("code")!)}`;
      return NextResponse.redirect(to);
    }
    if (qs.get("token_hash") && qs.get("type")) {
      to.pathname = "/auth/confirm";
      return NextResponse.redirect(to);
    }
    if (qs.get("error_code") && path !== "/login") {
      to.pathname = "/login";
      to.search = `?error_code=${encodeURIComponent(qs.get("error_code")!)}`;
      return NextResponse.redirect(to);
    }
  }
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}
