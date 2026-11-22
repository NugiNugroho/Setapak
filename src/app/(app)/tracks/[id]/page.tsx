import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Flame, Trash2, Star } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate, addDays } from "@/lib/dates";
import { aggregate, formatMetric, weekStart, DURATION_METRIC, type Metric } from "@/lib/tracks";
import { loadTracks, summarizeTrack } from "@/lib/tracks-data";
import { PageHeader, Card, Field, Bar } from "@/components/ui";
import { Heatmap } from "@/components/tracks/Heatmap";
import { LogForm } from "@/components/tracks/LogForm";
import { FocusSound } from "@/components/tracks/FocusSound";
import { addMetric, deleteLog, deleteMetric, setPrimaryMetric, setTrackArchived, updateMetric, updateTrack } from "../actions";

export const metadata = { title: "Detail track" };

const PERIOD = { day: "hari ini", week: "minggu ini", month: "bulan ini" } as const;
const TYPE = { number: "Angka", duration: "Durasi", check: "Centang", scale: "Skala 1–5" } as const;
const COLORS = ["#2F6B5E", "#2B5C8A", "#7A62A8", "#C2714F", "#B08A2E", "#2F7D4F"];

export default async function TrackDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [{ tracks, metrics: allMetrics, logs }, goals, identities, areas] = await Promise.all([
    loadTracks(supabase, today, 26, id),
    supabase.from("goals").select("id,title").eq("status", "active"),
    supabase.from("identities").select("id,statement").eq("archived", false),
    supabase.from("life_areas").select("id,name").order("sort_order"),
  ]);
  const track = tracks[0];
  if (!track) notFound();
  const metrics = allMetrics.filter((m) => m.track_id === id);
  const s = summarizeTrack(track, metrics, logs, today, 26);
  const shown: Metric[] = metrics.length ? metrics : [DURATION_METRIC];
  const durationTotal = logs.reduce((a, l) => a + (l.duration_min ?? 0), 0);

  // Tren 8 minggu per metrik (untuk sparkline).
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -(7 - i) * 7));
  const spark = (m: Metric) => weeks.map((w) => aggregate(m, logs.filter((l) => l.log_date >= w && l.log_date < addDays(w, 7))));
  const metricName = new Map(metrics.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/tracks" className="flex items-center gap-1 text-sm font-semibold text-accent"><ChevronLeft size={16} aria-hidden />Semua track</Link>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: track.color }} />{track.archived ? "Diarsipkan" : "Track"}</span>}
        title={`${track.icon ? track.icon + " " : ""}${track.name}`}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label={`${s.primary.name} ${PERIOD[s.primary.period ?? "week"]}`} value={formatMetric(s.periodValue, s.primary)} note={s.primary.target ? `target ${formatMetric(s.primary.target, s.primary)}` : undefined} />
        <Stat label="Streak" value={<span className="flex items-center gap-1"><Flame size={16} className="text-[#C2714F]" aria-hidden />{s.current} hari</span>} note={`terpanjang ${s.longest}`} />
        <Stat label="Total waktu" value={formatMetric(durationTotal, DURATION_METRIC)} note={`${logs.length} sesi`} />
      </div>
      {s.pct != null && <Bar pct={s.pct} height={8} />}

      <div className="flex flex-wrap gap-5">
        <div className="flex min-w-0 grow-[1.4] basis-[420px] flex-col gap-5">
          <Card title="26 minggu terakhir">
            <div className="overflow-x-auto pb-1"><Heatmap cells={s.cells} size={11} label={`Aktivitas 26 minggu ${track.name}`} /></div>
          </Card>

          <Card title="Metrik">
            {shown.map((m) => {
              const sp = spark(m);
              const max = Math.max(1, ...sp);
              const cur = aggregate(m, logs.filter((l) => l.log_date >= (m.period === "day" ? today : m.period === "month" ? today.slice(0, 8) + "01" : weekStart(today))));
              return (
                <div key={m.id} className="flex flex-col gap-2 border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-3">
                    <span className="flex flex-1 flex-col">
                      <span className="flex items-center gap-1.5 font-semibold">{m.name}{m.is_primary && <Star size={13} fill="currentColor" className="text-[#C9862B]" aria-label="metrik utama" />}</span>
                      <span className="text-xs text-muted">{TYPE[m.metric_type]} · {m.aggregation === "sum" ? "jumlah" : m.aggregation === "avg" ? "rata-rata" : "nilai terakhir"} {PERIOD[m.period ?? "week"]}: <b className="text-ink">{formatMetric(cur, m)}</b>{m.target ? ` / ${formatMetric(m.target, m)}` : ""}</span>
                    </span>
                    <svg width="96" height="32" viewBox="0 0 96 32" role="img" aria-label={`Tren 8 minggu ${m.name}`}>
                      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        points={sp.map((v, i) => `${4 + i * 12.5},${28 - (v / max) * 24}`).join(" ")} />
                    </svg>
                  </div>
                  {m.id !== "duration" && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-accent">Ubah target</summary>
                      <form action={updateMetric.bind(null, m.id)} className="mt-2 flex flex-wrap items-end gap-2">
                        <Field label="Target"><input name="target" type="number" step="any" defaultValue={m.target ?? ""} className="field w-28" /></Field>
                        <Field label="Periode"><select name="period" defaultValue={m.period ?? "week"} className="field"><option value="day">Harian</option><option value="week">Mingguan</option><option value="month">Bulanan</option></select></Field>
                        <button className="btn text-sm">Simpan</button>
                        {!m.is_primary && <button formAction={setPrimaryMetric.bind(null, id, m.id)} className="btn text-sm">Jadikan utama</button>}
                        <button formAction={deleteMetric.bind(null, m.id)} aria-label="Hapus metrik" className="btn size-11 px-0 text-neg"><Trash2 size={15} aria-hidden /></button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
            <details className="border-t border-line-soft pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-accent">+ Tambah metrik</summary>
              <form action={addMetric.bind(null, id)} className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Nama"><input name="name" required placeholder="Skor try-out" className="field" /></Field>
                <Field label="Tipe"><select name="metric_type" className="field">{Object.entries(TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="Satuan"><input name="unit" placeholder="poin" className="field" /></Field>
                <Field label="Rangkuman"><select name="aggregation" className="field"><option value="sum">Jumlah</option><option value="avg">Rata-rata</option><option value="last">Nilai terakhir</option></select></Field>
                <Field label="Target (opsional)"><input name="target" type="number" step="any" className="field" /></Field>
                <Field label="Periode"><select name="period" className="field"><option value="week">Mingguan</option><option value="day">Harian</option><option value="month">Bulanan</option></select></Field>
                <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary" className="size-4 accent-[var(--accent)]" />Jadikan metrik utama</label>
                <button className="btn col-span-2">Tambah metrik</button>
              </form>
            </details>
          </Card>
        </div>

        <div className="flex grow basis-[320px] flex-col gap-5">
          <Card title="Catat sesi">
            <FocusSound />
            <LogForm trackId={id} metrics={metrics} today={today} />
          </Card>

          <Card title="Log sesi" aside={`${logs.length} total`}>
            {logs.slice(0, 15).map((l) => {
              const parts = [
                l.duration_min ? formatMetric(l.duration_min, DURATION_METRIC) : null,
                ...Object.entries(l.values ?? {}).map(([k, v]) => { const m = metricName.get(k); return m ? `${m.name} ${formatMetric(Number(v), m)}` : null; }),
              ].filter(Boolean);
              return (
                <div key={l.id} className="flex min-h-12 items-center gap-3 border-t border-line-soft first:border-t-0">
                  <span className="w-16 shrink-0 text-xs text-muted">{formatShortDate(l.log_date, today)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{l.note || "Sesi"}</span>
                    <span className="truncate text-xs text-muted">{parts.join(" · ")}{l.mood ? ` · rasa ${l.mood}/5` : ""}</span>
                  </span>
                  <form action={deleteLog.bind(null, l.id)}><button aria-label="Hapus log" className="btn size-9 px-0 text-muted"><Trash2 size={14} aria-hidden /></button></form>
                </div>
              );
            })}
            {!logs.length && <p className="text-sm text-muted">Belum ada sesi. Mulai timer atau catat manual.</p>}
          </Card>

          <Card title="Pengaturan track">
            <form action={updateTrack.bind(null, id)} className="grid grid-cols-2 gap-2">
              <Field label="Nama" className="col-span-2"><div className="flex gap-2"><input name="icon" defaultValue={track.icon ?? ""} placeholder="📚" maxLength={8} aria-label="Ikon (emoji)" className="field w-16 text-center text-lg" /><input name="name" defaultValue={track.name} className="field" /></div></Field>
              <Field label="Warna"><select name="color" defaultValue={track.color} className="field">{COLORS.map((c, i) => <option key={c} value={c}>Warna {i + 1}</option>)}</select></Field>
              <Field label="Area"><select name="area_id" defaultValue={track.area_id ?? ""} className="field"><option value="">—</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="Goal" className="col-span-2"><select name="goal_id" defaultValue={track.goal_id ?? ""} className="field"><option value="">—</option>{(goals.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></Field>
              <Field label="Suara untuk identitas" className="col-span-2"><select name="identity_id" defaultValue={track.identity_id ?? ""} className="field"><option value="">—</option>{(identities.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.statement}</option>)}</select></Field>
              <button formAction={setTrackArchived.bind(null, id, !track.archived)} className="btn text-sm">{track.archived ? "Aktifkan lagi" : "Arsipkan"}</button>
              <button className="btn btn-primary text-sm">Simpan</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="card flex flex-col gap-1 px-3.5 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-lg font-bold">{value}</span>
      {note && <span className="text-[11px] text-muted">{note}</span>}
    </div>
  );
}
