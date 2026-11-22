import Link from "next/link";
import { Flame, Plus } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { formatMetric } from "@/lib/tracks";
import { loadTracks, summarizeTrack } from "@/lib/tracks-data";
import { PageHeader, Card, Field, Bar, Empty } from "@/components/ui";
import { Heatmap } from "@/components/tracks/Heatmap";
import { createTrack } from "./actions";

export const metadata = { title: "Tracks" };

const COLORS = ["#2F6B5E", "#2B5C8A", "#7A62A8", "#C2714F", "#B08A2E", "#2F7D4F"];
const PERIOD = { day: "hari ini", week: "minggu ini", month: "bulan ini" } as const;

export default async function TracksPage() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [{ tracks, metrics, logs }, areas, goals, identities] = await Promise.all([
    loadTracks(supabase, today, 12),
    supabase.from("life_areas").select("id,name").order("sort_order"),
    supabase.from("goals").select("id,title").eq("status", "active"),
    supabase.from("identities").select("id,statement").eq("archived", false),
  ]);
  const summaries = tracks.map((t) =>
    summarizeTrack(t, metrics.filter((m) => m.track_id === t.id), logs.filter((l) => l.track_id === t.id), today, 12),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Progress hal yang kamu tekuni" title="Tracks" actions={<a href="#baru" className="btn btn-primary"><Plus size={16} aria-hidden />Track baru</a>} />

      {summaries.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map((s) => (
            <Link key={s.track.id} href={`/tracks/${s.track.id}`} className="card flex flex-col gap-3 p-4 hover:border-accent">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold"><span className="size-3 rounded-full" style={{ background: s.track.color }} />{s.track.name}</span>
                {s.current > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-[#9a4a1e]"><Flame size={13} aria-hidden />{s.current} hari</span>}
              </div>
              <div className="overflow-hidden"><Heatmap cells={s.cells} size={10} label={`Aktivitas 12 minggu ${s.track.name}`} /></div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{s.primary.name} {PERIOD[s.primary.period ?? "week"]}</span>
                  <b>{formatMetric(s.periodValue, s.primary)}{s.primary.target ? ` / ${formatMetric(s.primary.target, s.primary)}` : ""}</b>
                </div>
                {s.pct != null && <Bar pct={s.pct} />}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>Belum ada track. Buat satu untuk hal yang sedang kamu tekuni, misalnya persiapan LPDP atau menulis paper.</Empty>
      )}

      <section id="baru" className="scroll-mt-6">
        <Card title="Track baru">
          <form action={createTrack} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Nama track" className="col-span-2"><input name="name" required placeholder="Persiapan LPDP" className="field" /></Field>
            <Field label="Warna">
              <select name="color" className="field">{COLORS.map((c, i) => <option key={c} value={c}>Warna {i + 1}</option>)}</select>
            </Field>
            <Field label="Area hidup">
              <select name="area_id" className="field"><option value="">—</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            </Field>
            <Field label="Metrik utama">
              <select name="metric_type" className="field"><option value="duration">Durasi (menit)</option><option value="number">Angka</option><option value="check">Centang (sekali sehari)</option></select>
            </Field>
            <Field label="Nama metrik (jika angka)"><input name="metric_name" placeholder="Halaman, konten, kata…" className="field" /></Field>
            <Field label="Satuan (jika angka)"><input name="unit" placeholder="hal, konten" className="field" /></Field>
            <Field label="Target"><div className="flex gap-2"><input name="target" type="number" min={0} placeholder="300" className="field" />
              <select name="period" aria-label="Periode target" className="field w-32"><option value="week">/minggu</option><option value="day">/hari</option><option value="month">/bulan</option></select></div></Field>
            <Field label="Goal (opsional)" className="col-span-2">
              <select name="goal_id" className="field"><option value="">—</option>{(goals.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
            </Field>
            <Field label="Suara untuk identitas (opsional)" className="col-span-2">
              <select name="identity_id" className="field"><option value="">—</option>{(identities.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.statement}</option>)}</select>
            </Field>
            <p className="col-span-2 text-xs text-muted md:col-span-4">Untuk target durasi, isi dalam menit (mis. 480 = 8 jam per minggu). Metrik lain bisa ditambah setelah track dibuat.</p>
            <button className="btn btn-primary col-span-2 md:col-span-4">Buat track</button>
          </form>
        </Card>
      </section>
    </div>
  );
}
