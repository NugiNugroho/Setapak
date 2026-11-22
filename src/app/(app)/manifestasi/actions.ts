"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { HabitStatus } from "@/lib/habits";

async function ctx() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Belum masuk");
  return supabase;
}
const done = () => revalidatePath("/", "layout");
const s = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

// ---------------------------------------------------------------- Habit

export async function saveHabit(f: FormData) {
  const supabase = await ctx();
  const id = s(f, "id");

  let identity_id = s(f, "identity_id");
  const newIdentity = s(f, "new_identity");
  if (identity_id === "__new" || (!identity_id && newIdentity)) {
    const { data } = await supabase
      .from("identities")
      .insert({ statement: newIdentity ?? "Identitas baru", area_id: s(f, "area_id") })
      .select("id")
      .single();
    identity_id = data?.id ?? null;
  }
  if (!identity_id) redirect("/manifestasi/habit/baru?error=identitas");

  let stack_id = s(f, "stack_id");
  const newStack = s(f, "new_stack");
  if (stack_id === "__new" && newStack) {
    const { data } = await supabase
      .from("habit_stacks")
      .insert({ name: newStack, anchor: s(f, "new_anchor") })
      .select("id")
      .single();
    stack_id = data?.id ?? null;
  } else if (stack_id === "__new") stack_id = null;

  const days = f.getAll("days").map(Number);
  const frequency = days.length && days.length < 7 ? { type: "weekly", days } : { type: "daily" };

  const row = {
    identity_id,
    kind: s(f, "kind") === "break" ? "break" : "build",
    name: s(f, "name") ?? "Habit",
    cue_time: s(f, "cue_time"),
    cue_location: s(f, "cue_location"),
    stack_id,
    stack_order: Number(s(f, "stack_order") ?? 0),
    environment_note: s(f, "environment_note"),
    bundle: s(f, "bundle"),
    two_min_version: s(f, "two_min_version"),
    full_version: s(f, "full_version"),
    reward: s(f, "reward"),
    friction_note: s(f, "friction_note"),
    frequency,
    level: Math.max(1, Number(s(f, "level") ?? 1)),
    track_id: s(f, "track_id"),
    remind_missed: f.get("remind_missed") === "on",
  };
  const res = id
    ? await supabase.from("habits").update(row).eq("id", id).select("id").single()
    : await supabase.from("habits").insert(row).select("id").single();
  done();
  redirect(res.data ? `/manifestasi/habit/${res.data.id}` : "/manifestasi");
}

export async function setHabitStatus(habitId: string, date: string, status: HabitStatus | null) {
  const supabase = await ctx();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (status) {
    const { user } = await getUser();
    await supabase
      .from("habit_logs")
      .upsert({ user_id: user!.id, habit_id: habitId, log_date: date, status }, { onConflict: "habit_id,log_date" });
  } else {
    await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date);
  }

  // Habit yang tertaut ke Track ikut mencatat sesi (satu per hari).
  const { data: h } = await supabase.from("habits").select("track_id,name").eq("id", habitId).single();
  if (h?.track_id) {
    const marker = `habit:${habitId}`;
    await supabase.from("track_logs").delete().eq("track_id", h.track_id).eq("log_date", date).eq("note", marker);
    if (status === "done" || status === "minimal")
      await supabase.from("track_logs").insert({ track_id: h.track_id, log_date: date, note: marker, values: {} });
  }
  done();
}

export async function setHabitLevel(id: string, level: number) {
  const supabase = await ctx();
  await supabase.from("habits").update({ level: Math.max(1, level) }).eq("id", id);
  done();
}

export async function setHabitArchived(id: string, archived: boolean) {
  const supabase = await ctx();
  await supabase.from("habits").update({ archived }).eq("id", id);
  done();
  if (archived) redirect("/manifestasi");
}

export async function deleteStack(id: string) {
  const supabase = await ctx();
  await supabase.from("habit_stacks").delete().eq("id", id);
  done();
}

// ---------------------------------------------------------------- Identitas

export async function addIdentity(f: FormData) {
  const supabase = await ctx();
  const statement = s(f, "statement");
  if (!statement) return;
  await supabase.from("identities").insert({ statement, area_id: s(f, "area_id") });
  done();
}

// ---------------------------------------------------------------- Goal & milestone

export async function saveGoal(f: FormData) {
  const supabase = await ctx();
  const title = s(f, "title");
  if (!title) return;
  await supabase.from("goals").insert({
    title,
    why: s(f, "why"),
    target_date: s(f, "target_date"),
    metric: s(f, "metric"),
    area_id: s(f, "area_id"),
    identity_id: s(f, "identity_id"),
  });
  done();
}

export async function addMilestone(goalId: string, f: FormData) {
  const supabase = await ctx();
  const title = s(f, "title");
  if (!title) return;
  await supabase.from("milestones").insert({ goal_id: goalId, title });
  done();
}

export async function toggleMilestone(id: string, isDone: boolean) {
  const supabase = await ctx();
  await supabase.from("milestones").update({ done_at: isDone ? new Date().toISOString() : null }).eq("id", id);
  done();
}

export async function deleteMilestone(id: string) {
  const supabase = await ctx();
  await supabase.from("milestones").delete().eq("id", id);
  done();
}

export async function achieveGoal(goalId: string, f: FormData) {
  const supabase = await ctx();
  await supabase.from("goals").update({ status: "achieved", achieved_at: new Date().toISOString() }).eq("id", goalId);
  const body = s(f, "reflection");
  if (body) await supabase.from("journal_entries").insert({ kind: "realized", body, goal_id: goalId });
  done();
}

export async function setGoalStatus(goalId: string, status: "active" | "released") {
  const supabase = await ctx();
  await supabase.from("goals").update({ status, achieved_at: null }).eq("id", goalId);
  done();
}

export async function addVision(f: FormData) {
  const supabase = await ctx();
  const caption = s(f, "caption");
  if (!caption) return;
  await supabase.from("vision_items").insert({ caption, area_id: s(f, "area_id") });
  done();
}

export async function deleteVision(id: string) {
  const supabase = await ctx();
  await supabase.from("vision_items").delete().eq("id", id);
  done();
}

// ---------------------------------------------------------------- Scorecard

export async function addScorecard(f: FormData) {
  const supabase = await ctx();
  const routine = s(f, "routine");
  if (!routine) return;
  const { count } = await supabase.from("scorecard_items").select("id", { count: "exact", head: true });
  await supabase.from("scorecard_items").insert({ routine, rating: s(f, "rating") ?? "=", sort_order: count ?? 0 });
  done();
}

export async function setScorecardRating(id: string, rating: "+" | "-" | "=") {
  const supabase = await ctx();
  await supabase.from("scorecard_items").update({ rating }).eq("id", id);
  done();
}

export async function deleteScorecard(id: string) {
  const supabase = await ctx();
  await supabase.from("scorecard_items").delete().eq("id", id);
  done();
}

// ---------------------------------------------------------------- Refleksi

export async function addJournal(f: FormData) {
  const supabase = await ctx();
  const body = s(f, "body");
  if (!body) return;
  const kind = s(f, "kind") ?? "journal";
  await supabase.from("journal_entries").insert({
    kind: ["gratitude", "journal", "scripting"].includes(kind) ? kind : "journal",
    body,
    entry_date: s(f, "entry_date") ?? undefined,
    reopen_at: kind === "scripting" ? s(f, "reopen_at") : null,
  });
  done();
}

export async function deleteJournalEntry(id: string) {
  const supabase = await ctx();
  await supabase.from("journal_entries").delete().eq("id", id);
  done();
}

export async function saveAnnualReview(year: number, f: FormData) {
  const supabase = await ctx();
  const { user } = await getUser();
  await supabase.from("annual_reviews").upsert(
    {
      user_id: user!.id,
      year,
      answers: {
        good: s(f, "good") ?? "",
        bad: s(f, "bad") ?? "",
        learned: s(f, "learned") ?? "",
        integrity: s(f, "integrity") ?? "",
      },
      values: String(f.get("values") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    },
    { onConflict: "user_id,year" },
  );
  done();
}
