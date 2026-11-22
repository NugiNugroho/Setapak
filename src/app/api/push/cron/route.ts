import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { supabaseEnv } from "@/lib/supabase/env";
import { reminderMessage } from "@/lib/reminder-copy";

export const dynamic = "force-dynamic";

/**
 * Dipanggil terjadwal (pg_cron di Supabase, tiap 15 menit) untuk mengirim
 * pengingat pagi/malam. Diamankan dengan CRON_SECRET; data diambil lewat
 * fungsi push_due yang juga memeriksa token yang sama di database.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "VAPID key belum diisi" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://github.com/NugiNugroho/Setapak", pub, priv);

  const { url, key } = supabaseEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("push_due", { p_token: secret, p_window_min: 15 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dayNo = Math.floor(Date.now() / 864e5);
  type Row = { endpoint: string; p256dh: string; auth: string; kind: "morning" | "evening"; name: string; open_tasks: number; habits_left: number };
  const results = await Promise.allSettled(
    ((data ?? []) as Row[]).map(async (r) => {
      const msg = reminderMessage(r.kind, r.name, r.open_tasks, r.habits_left, dayNo);
      try {
        await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(msg), { TTL: 3600 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.rpc("push_gone", { p_token: secret, p_endpoint: r.endpoint });
        throw e;
      }
    }),
  );
  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}

export const GET = handle;
export const POST = handle;
