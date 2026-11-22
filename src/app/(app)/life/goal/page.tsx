import { Trash2, Check } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import { PageHeader, Card, Field, Bar, Empty } from "@/components/ui";
import { LifeNav } from "@/components/life/LifeNav";
import {
  saveGoal, addMilestone, toggleMilestone, deleteMilestone, achieveGoal, setGoalStatus, addVision, deleteVision,
} from "../actions";

export const metadata = { title: "Visi & Goal" };

export default async function GoalPage() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [goals, ms, areas, ids, vision, habits, tracks, tasks] = await Promise.all([
    supabase.from("goals").select("*").order("status").order("target_date", { nullsFirst: false }),
    supabase.from("milestones").select("*").order("sort_order").order("created_at"),
    supabase.from("life_areas").select("id,name,color").order("sort_order"),
    supabase.from("identities").select("id,statement").eq("archived", false),
    supabase.from("vision_items").select("*").order("sort_order").order("created_at"),
    supabase.from("habits").select("id,identity_id").eq("archived", false),
    supabase.from("tracks").select("id,goal_id").eq("archived", false),
    supabase.from("tasks").select("id,goal_id,completed_at").not("goal_id", "is", null),
  ]);
  const area = new Map((areas.data ?? []).map((a) => [a.id, a]));
  const active = (goals.data ?? []).filter((g) => g.status === "active");
  const past = (goals.data ?? []).filter((g) => g.status !== "active");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Life" title="Visi & Goal" />
      <LifeNav current="goal" />

      <Card title="Visi">
        <p className="text-xs text-muted">Gambaran hidup yang kamu tuju, per area. Goal tanpa sistem hanyalah keinginan; tautkan setiap goal ke habit atau track.</p>
        {(vision.data ?? []).length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(vision.data ?? []).map((v) => {
              const a = area.get(v.area_id ?? "");
              return (
                <div key={v.id} className="group relative flex min-h-24 flex-col justify-end gap-1 rounded-xl p-4" style={{ background: `${a?.color ?? "#2F6B5E"}14` }}>
                  {a && <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: a.color }}>{a.name}</span>}
                  <p className="font-semibold leading-snug">{v.caption}</p>
                  <form action={deleteVision.bind(null, v.id)} className="absolute top-2 right-2"><button aria-label="Hapus visi" className="flex size-8 items-center justify-center rounded-lg text-muted hover:text-neg"><Trash2 size={14} aria-hidden /></button></form>
                </div>
              );
            })}
          </div>
        ) : <Empty>Belum ada visi.</Empty>}
        <form action={addVision} className="flex flex-wrap gap-2">
          <label className="min-w-[240px] flex-[3]"><span className="sr-only">Visi</span><input name="caption" required placeholder="Kuliah S2 dengan beasiswa dan meneliti ML untuk data BPS" className="field" /></label>
          <label className="min-w-[140px] flex-1"><span className="sr-only">Area</span><select name="area_id" className="field"><option value="">Area…</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <button className="btn">Tambah visi</button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {active.map((g) => {
          const list = (ms.data ?? []).filter((m) => m.goal_id === g.id);
          const doneCount = list.filter((m) => m.done_at).length;
          const p = list.length ? (doneCount / list.length) * 100 : 0;
          const a = area.get(g.area_id ?? "");
          const linkedTracks = (tracks.data ?? []).filter((t) => t.goal_id === g.id).length;
          const linkedHabits = g.identity_id ? (habits.data ?? []).filter((h) => h.identity_id === g.identity_id).length : 0;
          const goalTasks = (tasks.data ?? []).filter((t) => t.goal_id === g.id);
          return (
            <section key={g.id} aria-label={g.title} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  {a && <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: a.color }}>{a.name}</span>}
                  <h2 className="text-lg font-bold">{g.title}</h2>
                  {g.why && <p className="text-sm text-ink-2">Mengapa: {g.why}</p>}
                </div>
                <b className="text-lg">{Math.round(p)}%</b>
              </div>
              <Bar pct={p} height={8} />
              <span className="text-xs text-muted">
                {[g.target_date && `target ${formatShortDate(g.target_date, today)}`, g.metric && `ukuran: ${g.metric}`, `${linkedHabits} habit`, `${linkedTracks} track`, goalTasks.length && `${goalTasks.filter((t) => t.completed_at).length}/${goalTasks.length} task`].filter(Boolean).join(" · ")}
              </span>
              <div className="flex flex-col">
                {list.map((m) => (
                  <div key={m.id} className="flex min-h-11 items-center gap-2 border-t border-line-soft">
                    <form action={toggleMilestone.bind(null, m.id, !m.done_at)}>
                      <button aria-label={m.done_at ? `Batalkan ${m.title}` : `Selesaikan ${m.title}`} className="flex size-10 items-center justify-center">
                        <span className={`flex size-5 items-center justify-center rounded-md border-[1.5px] ${m.done_at ? "border-accent bg-accent text-on-accent" : "border-line"}`}>{m.done_at && <Check size={12} strokeWidth={3} aria-hidden />}</span>
                      </button>
                    </form>
                    <span className={`flex-1 text-sm ${m.done_at ? "text-muted line-through" : ""}`}>{m.title}</span>
                    <form action={deleteMilestone.bind(null, m.id)}><button aria-label="Hapus milestone" className="flex size-9 items-center justify-center text-muted hover:text-neg"><Trash2 size={13} aria-hidden /></button></form>
                  </div>
                ))}
                <form action={addMilestone.bind(null, g.id)} className="flex gap-2 border-t border-line-soft pt-2">
                  <label className="flex-1"><span className="sr-only">Milestone baru</span><input name="title" placeholder="+ Milestone" className="field min-h-10" /></label>
                  <button className="btn min-h-10 text-sm">Tambah</button>
                </form>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-accent">Tandai tercapai</summary>
                <form action={achieveGoal.bind(null, g.id)} className="mt-2 flex flex-col gap-2">
                  <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Jurnal Terwujud: apa yang membuatnya berhasil?</span>
                    <textarea name="reflection" rows={3} className="field py-2" /></label>
                  <div className="flex gap-2">
                    <button className="btn btn-primary text-sm">Tercapai</button>
                    <button formAction={setGoalStatus.bind(null, g.id, "released")} className="btn text-sm">Lepaskan goal ini</button>
                  </div>
                </form>
              </details>
            </section>
          );
        })}
      </div>
      {!active.length && <Empty>Belum ada goal aktif.</Empty>}

      <Card title="Goal baru">
        <form action={saveGoal} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Goal" className="col-span-2"><input name="title" required placeholder="Lolos LPDP tahap 1" className="field" /></Field>
          <Field label="Target tanggal"><input type="date" name="target_date" className="field" /></Field>
          <Field label="Area"><select name="area_id" className="field"><option value="">—</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Mengapa ini penting?" className="col-span-2"><input name="why" className="field" /></Field>
          <Field label="Ukuran keberhasilan"><input name="metric" placeholder="Pengumuman lolos" className="field" /></Field>
          <Field label="Identitas"><select name="identity_id" className="field"><option value="">—</option>{(ids.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.statement}</option>)}</select></Field>
          <button className="btn btn-primary col-span-2 md:col-span-4">Tambah goal</button>
        </form>
      </Card>

      {past.length > 0 && (
        <Card title="Tercapai & dilepaskan">
          {past.map((g) => (
            <div key={g.id} className="flex min-h-11 items-center gap-3 border-t border-line-soft first:border-t-0">
              <span className={`text-xs font-bold uppercase ${g.status === "achieved" ? "text-pos" : "text-muted"}`}>{g.status === "achieved" ? "Tercapai" : "Dilepas"}</span>
              <span className="flex-1">{g.title}</span>
              <form action={setGoalStatus.bind(null, g.id, "active")}><button className="btn min-h-9 text-xs">Aktifkan lagi</button></form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
