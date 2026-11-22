import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (e) {
    // Tampilkan penyebab yang bisa ditindaklanjuti, bukan error 500 kosong.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const problems: string[] = [];
    if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL belum diisi");
    else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) problems.push(`NEXT_PUBLIC_SUPABASE_URL formatnya tidak dikenali (harus seperti https://xxxx.supabase.co)`);
    if (!key) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi");
    else if (!/^(eyJ|sb_publishable_)/.test(key)) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY bukan kunci anon/publishable (harus diawali eyJ… atau sb_publishable_…)");
    const detail = problems.length ? problems : [`Gagal menghubungi Supabase: ${e instanceof Error ? e.message : String(e)}`];
    const html = `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setapak · konfigurasi</title>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#1c1c1a">
<h1 style="font-size:20px">Setapak belum bisa terhubung ke database</h1>
<ul>${detail.map((d) => `<li>${d.replace(/</g, "&lt;")}</li>`).join("")}</ul>
<p style="color:#6e6c66;font-size:14px">Perbaiki di Vercel → Settings → Environment Variables, lalu Redeploy.</p></body></html>`;
    return new NextResponse(html, { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
