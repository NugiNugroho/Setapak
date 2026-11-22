import { Trash2, Lock } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate, addDays } from "@/lib/dates";
import { PageHeader, Card, Field, Empty } from "@/components/ui";
import { LifeNav } from "@/components/life/LifeNav";
import { ImageField } from "@/components/personal/ImageField";
import { signedUrls } from "@/lib/media";
import { addJournal, deleteJournalEntry, saveAnnualReview } from "../actions";

export const metadata = { title: "Refleksi" };

const KIND = { gratitude: "Gratitude", journal: "Jurnal", scripting: "Surat untuk diri masa depan", realized: "Terwujud" } as const;

export default async function Refleksi() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const year = Number(today.slice(0, 4));
  const [entries, annual] = await Promise.all([
    supabase.from("journal_entries").select("*").gte("entry_date", addDays(today, -180)).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(120),
    supabase.from("annual_reviews").select("*").eq("year", year).maybeSingle(),
  ]);
  const list = entries.data ?? [];
  const photoUrls = await signedUrls(supabase, list.map((e) => e.image_path));
  const a = (annual.data?.answers ?? {}) as Record<string, string>;
  const grouped: [string, typeof list][] = [];
  for (const e of list) {
    const g = grouped.find(([d]) => d === e.entry_date);
    if (g) g[1].push(e);
    else grouped.push([e.entry_date, [e]]);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Manifestasi" title="Refleksi" />
      <LifeNav current="refleksi" />

      <Card title="Tulis">
        <form action={addJournal} className="grid grid-cols-2 gap-2">
          <Field label="Jenis">
            <select name="kind" className="field"><option value="journal">Jurnal</option><option value="gratitude">Gratitude</option><option value="scripting">Surat untuk diri masa depan</option></select>
          </Field>
          <Field label="Tanggal"><input type="date" name="entry_date" defaultValue={today} className="field" /></Field>
          <Field label="Isi" className="col-span-2"><textarea name="body" rows={4} className="field py-2" placeholder="Tulis seolah tujuanmu sudah tercapai, atau apa saja yang ada di pikiran…" /></Field>
          <div className="col-span-2"><ImageField name="image_path" kind="journal" label="Tambah foto (opsional)" /></div>
          <Field label="Buka kembali pada (khusus surat masa depan)"><input type="date" name="reopen_at" className="field" /></Field>
          <div className="flex items-end"><button className="btn btn-primary w-full">Simpan</button></div>
        </form>
      </Card>

      <Card title="Catatan 6 bulan terakhir">
        {grouped.length ? grouped.map(([d, es]) => (
          <section key={d} aria-label={d} className="flex flex-col gap-1.5 border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">{formatShortDate(d, today)}</h3>
            {es.map((e) => {
              const sealed = e.kind === "scripting" && e.reopen_at && e.reopen_at > today;
              return (
                <div key={e.id} className="flex items-start gap-2 rounded-xl bg-surface-2 p-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-[11px] font-semibold text-accent uppercase">{KIND[e.kind as keyof typeof KIND]}</span>
                    {sealed ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted"><Lock size={13} aria-hidden />Tersegel sampai {formatShortDate(e.reopen_at, today)}</span>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {e.image_path && photoUrls.get(e.image_path) && <img src={photoUrls.get(e.image_path)} alt="Foto catatan" className="max-h-64 w-fit rounded-lg object-cover" />}
                        {e.body && <p className="text-sm whitespace-pre-line">{e.body}</p>}
                      </>
                    )}
                  </div>
                  <form action={deleteJournalEntry.bind(null, e.id)}><button aria-label="Hapus catatan" className="flex size-8 items-center justify-center text-muted hover:text-neg"><Trash2 size={13} aria-hidden /></button></form>
                </div>
              );
            })}
          </section>
        )) : <Empty>Belum ada catatan.</Empty>}
      </Card>

      <Card title={`Annual Review ${year}`}>
        <p className="text-xs text-muted">Sekali setahun: apa yang berjalan baik, apa yang tidak, apa yang dipelajari, dan apakah hidupmu selaras dengan nilai-nilaimu (Integrity Report).</p>
        <form action={saveAnnualReview.bind(null, year)} className="grid gap-2 md:grid-cols-2">
          <Field label="Apa yang berjalan baik tahun ini?"><textarea name="good" rows={3} defaultValue={a.good ?? ""} className="field py-2" /></Field>
          <Field label="Apa yang tidak berjalan baik?"><textarea name="bad" rows={3} defaultValue={a.bad ?? ""} className="field py-2" /></Field>
          <Field label="Apa yang aku pelajari?"><textarea name="learned" rows={3} defaultValue={a.learned ?? ""} className="field py-2" /></Field>
          <Field label="Integrity Report: sudahkah aku hidup sesuai nilai-nilaiku?"><textarea name="integrity" rows={3} defaultValue={a.integrity ?? ""} className="field py-2" /></Field>
          <Field label="Nilai-nilai inti (pisahkan koma)" className="md:col-span-2"><input name="values" defaultValue={(annual.data?.values ?? []).join(", ")} placeholder="jujur, tekun, bermanfaat" className="field" /></Field>
          <button className="btn btn-primary md:col-span-2">Simpan Annual Review</button>
        </form>
      </Card>
    </div>
  );
}
