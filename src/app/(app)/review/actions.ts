"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";

export async function saveReview(weekStart: string, summary: Record<string, unknown>, f: FormData) {
  const { supabase, user } = await getUser();
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;
  const finish = f.get("finish") === "1";
  const answers = Object.fromEntries(
    [...f.entries()].filter(([k]) => k.startsWith("q_")).map(([k, v]) => [k.slice(2), String(v)]),
  );
  const priorities = f.getAll("priority").map((p) => String(p).trim()).filter(Boolean).slice(0, 3);

  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("completed_at")
    .eq("week_start", weekStart)
    .maybeSingle();

  await supabase.from("weekly_reviews").upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      summary,
      answers,
      priorities,
      completed_at: finish ? new Date().toISOString() : existing?.completed_at ?? null,
    },
    { onConflict: "user_id,week_start" },
  );

  // Saat review diselesaikan pertama kali, 3 prioritas menjadi task Senin depan.
  if (finish && !existing?.completed_at && priorities.length) {
    const nextMonday = addDays(weekStart, 7);
    await supabase.from("tasks").insert(
      priorities.map((title, i) => ({ title, due_date: nextMonday, is_top: true, priority: (i + 1) as 1 | 2 | 3, labels: ["review"] })),
    );
  }
  revalidatePath("/", "layout");
}
