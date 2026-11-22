/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { signedUrls } from "@/lib/media";
import { DEFAULT_GREETINGS, DEFAULT_LABELS, FONTS, type FontKey } from "@/lib/prefs";
import { Card, Field } from "@/components/ui";
import { MediaUploader } from "@/components/personal/MediaUploader";
import { SoundTester } from "@/components/personal/SoundTester";
import { deleteMedia } from "@/app/(app)/media/actions";
import { saveAppearance, saveWords, saveSounds, addQuote, toggleQuote, deleteQuote } from "../actions";

export const metadata = { title: "Personalisasi" };

const ACCENTS = [
  ["#0B5A3C", "Hijau Setapak"],
  ["#2F6B5E", "Hijau teduh"],
  ["#2B5C8A", "Biru"],
  ["#5B4A8F", "Ungu"],
  ["#C2621B", "Oranye senja"],
  ["#A5502E", "Terakota"],
  ["#3D3C38", "Arang"],
] as const;

const THEMES = [
  ["light", "Terang"],
  ["dark", "Gelap"],
  ["system", "Ikut sistem"],
  ["time", "Ikut waktu (06–18 terang)"],
] as const;

export default async function Personalisasi() {
  const { supabase, profile } = await requireProfile();
  const p = profile.prefs;
  const [media, quotes] = await Promise.all([
    supabase.from("media").select("*").order("sort_order").order("created_at"),
    supabase.from("quotes").select("*").order("created_at"),
  ]);
  const covers = (media.data ?? []).filter((m) => m.kind === "cover");
  const audio = (media.data ?? []).filter((m) => m.kind === "audio");
  const urls = await signedUrls(supabase, covers.map((c) => c.path));
  const isPreset = ACCENTS.some(([c]) => c.toLowerCase() === profile.accent_color.toLowerCase());

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/pengaturan" className="flex items-center gap-1 text-sm font-semibold text-accent"><ChevronLeft size={16} aria-hidden />Pengaturan</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Personalisasi</h1>
        <p className="text-sm text-muted">Bikin Setapak terasa seperti milikmu sendiri.</p>
      </header>

      <Card title="Foto sampul Hari Ini">
        <p className="text-sm text-muted">Tampil di atas dashboard bersama sapaanmu. Unggah beberapa foto, lalu pilih apakah gantian setiap hari.</p>
        {covers.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {covers.map((c) => (
              <div key={c.id} className="group relative overflow-hidden rounded-xl bg-line-soft">
                {urls.get(c.path) && <img src={urls.get(c.path)} alt="Foto sampul" className="aspect-[16/9] w-full object-cover" />}
                <form action={deleteMedia.bind(null, c.id)} className="absolute top-1.5 right-1.5">
                  <button aria-label="Hapus foto sampul" className="flex size-8 items-center justify-center rounded-lg bg-black/55 text-white"><Trash2 size={14} aria-hidden /></button>
                </form>
              </div>
            ))}
          </div>
        )}
        <MediaUploader kind="cover" label="Unggah foto sampul" />
      </Card>

      <form action={saveAppearance} className="flex flex-col gap-6">
        <Card title="Tampilan">
          <label className="flex min-h-10 items-center justify-between gap-3">
            <span>Tampilkan foto sampul</span>
            <input type="checkbox" name="coverShow" defaultChecked={p.coverShow !== false} className="size-5 accent-[var(--accent)]" />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-3 border-t border-line-soft">
            <span>Ganti foto sampul setiap hari</span>
            <input type="checkbox" name="coverRotate" defaultChecked={p.coverRotate !== false} className="size-5 accent-[var(--accent)]" />
          </label>

          <fieldset className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <legend className="mb-1 text-xs text-muted">Tema</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEMES.map(([v, l]) => (
                <label key={v} className="flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-line px-2 text-center text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-semibold">
                  <input type="radio" name="theme" value={v} defaultChecked={profile.theme === v} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <legend className="mb-1 text-xs text-muted">Warna aksen</legend>
            <div className="flex flex-wrap items-center gap-3">
              {ACCENTS.map(([c, l]) => (
                <label key={c} className="cursor-pointer" title={l}>
                  <input type="radio" name="accent_color" value={c} defaultChecked={profile.accent_color.toLowerCase() === c.toLowerCase()} className="peer sr-only" />
                  <span aria-label={l} className="block size-9 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2" style={{ background: c }} />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="use_custom" defaultChecked={!isPreset} className="size-4 accent-[var(--accent)]" />Pakai warna sendiri</label>
              <label className="flex items-center gap-2"><span className="sr-only">Warna sendiri</span>
                <input type="color" name="accent_custom" defaultValue={isPreset ? "#0B5A3C" : profile.accent_color} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" /></label>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <legend className="mb-1 text-xs text-muted">Font</legend>
            {(Object.keys(FONTS) as FontKey[]).map((k) => (
              <label key={k} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border border-line px-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                {FONTS[k].css && <link rel="stylesheet" href={FONTS[k].css!} precedence="default" />}
                <input type="radio" name="font" value={k} defaultChecked={(p.font ?? "jakarta") === k} className="size-4 accent-[var(--accent)]" />
                <span className="flex flex-col">
                  <span className="text-lg font-semibold" style={{ fontFamily: FONTS[k].family }}>Langkah kecil, jejak panjang.</span>
                  <span className="text-xs text-muted">{FONTS[k].label}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button className="btn btn-primary self-start">Simpan tampilan</button>
        </Card>
      </form>

      <form action={saveWords} className="flex flex-col gap-6">
        <Card title="Sapaan & nama modul">
          <p className="text-sm text-muted">Pakai <code className="rounded bg-line-soft px-1">{"{nama}"}</code> untuk menyisipkan namamu. Kosongkan untuk kembali ke bawaan.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["pagi", "siang", "sore", "malam"] as const).map((k) => (
              <Field key={k} label={`Sapaan ${k}`}>
                <input name={`g_${k}`} defaultValue={p.greetings?.[k] ?? ""} placeholder={DEFAULT_GREETINGS[k]} className="field" maxLength={80} />
              </Field>
            ))}
          </div>
          <div className="grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-3">
            {(Object.keys(DEFAULT_LABELS) as (keyof typeof DEFAULT_LABELS)[]).map((k) => (
              <Field key={k} label={`Nama modul ${DEFAULT_LABELS[k]}`}>
                <input name={`l_${k}`} defaultValue={p.moduleLabels?.[k] ?? ""} placeholder={DEFAULT_LABELS[k]} className="field" maxLength={24} />
              </Field>
            ))}
          </div>
          <button className="btn btn-primary self-start">Simpan kata-kata</button>
        </Card>
      </form>

      <Card title="Kutipan favorit">
        <p className="text-sm text-muted">Muncul bergiliran di blok Kutipan pada dashboard (tambahkan lewat Atur dashboard).</p>
        {(quotes.data ?? []).map((q) => (
          <div key={q.id} className="flex min-h-12 items-center gap-3 border-t border-line-soft first:border-t-0">
            <span className={`flex-1 text-sm ${q.active ? "" : "text-muted line-through"}`}>“{q.text}”{q.author && <span className="text-muted"> — {q.author}</span>}</span>
            <form action={toggleQuote.bind(null, q.id, !q.active)}><button className="btn min-h-9 text-xs">{q.active ? "Nonaktifkan" : "Aktifkan"}</button></form>
            <form action={deleteQuote.bind(null, q.id)}><button aria-label="Hapus kutipan" className="btn size-9 px-0 text-neg"><Trash2 size={14} aria-hidden /></button></form>
          </div>
        ))}
        <form action={addQuote} className="flex flex-wrap gap-2 border-t border-line-soft pt-3">
          <label className="min-w-[220px] flex-[3]"><span className="sr-only">Kutipan</span><input name="text" required placeholder="Tak perlu cepat, asal tak berhenti." className="field" /></label>
          <label className="min-w-[120px] flex-1"><span className="sr-only">Sumber</span><input name="author" placeholder="Sumber (opsional)" className="field" /></label>
          <button className="btn">Tambah</button>
        </form>
      </Card>

      <form action={saveSounds}>
        <Card title="Suara">
          <label className="flex min-h-10 items-center justify-between gap-3">
            <span>Bunyi saat task selesai, habit dicentang, dan sesi tercatat</span>
            <input type="checkbox" name="sounds" defaultChecked={p.sounds?.enabled !== false} className="size-5 accent-[var(--accent)]" />
          </label>
          <label className="flex items-center gap-3 border-t border-line-soft pt-3 text-sm">
            <span className="w-20">Volume</span>
            <input type="range" name="volume" min={0} max={100} defaultValue={Math.round((p.sounds?.volume ?? 0.6) * 100)} className="flex-1 accent-[var(--accent)]" />
          </label>
          <SoundTester />
          <button className="btn btn-primary self-start">Simpan suara</button>
        </Card>
      </form>

      <Card title="Lagu fokus">
        <p className="text-sm text-muted">Lagu milikmu untuk menemani timer di Tracks (maks. 25 MB per file). Suara latar hujan, ombak, dan brown noise sudah tersedia tanpa unggah.</p>
        {audio.map((a) => (
          <div key={a.id} className="flex min-h-12 items-center gap-3 border-t border-line-soft first:border-t-0">
            <span className="flex-1 truncate text-sm font-medium">{a.title ?? "Lagu"}</span>
            {a.size_bytes && <span className="text-xs text-muted">{(a.size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
            <form action={deleteMedia.bind(null, a.id)}><button aria-label="Hapus lagu" className="btn size-9 px-0 text-neg"><Trash2 size={14} aria-hidden /></button></form>
          </div>
        ))}
        <MediaUploader kind="audio" label="Unggah lagu" />
      </Card>
    </div>
  );
}
