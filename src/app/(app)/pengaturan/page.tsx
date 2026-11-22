import { Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { loadPrivacy } from "@/lib/finance";
import { ReplayWelcome } from "@/components/ReplayWelcome";
import {
  saveProfile, savePrivacy, addAffirmation, toggleAffirmation, deleteAffirmation, addIdentity, deleteIdentity,
} from "./actions";

export const metadata = { title: "Pengaturan" };

const ACCENTS = [
  ["#2F6B5E", "Hijau tua"],
  ["#2B5C8A", "Biru"],
  ["#5B4A8F", "Ungu"],
  ["#A5502E", "Terakota"],
  ["#3D3C38", "Arang"],
] as const;

const ZONES = [
  ["Asia/Jakarta", "WIB (Jakarta)"],
  ["Asia/Makassar", "WITA (Makassar, Palu)"],
  ["Asia/Jayapura", "WIT (Jayapura)"],
] as const;

export default async function Pengaturan() {
  const { supabase, profile } = await requireProfile();
  const [{ data: areas }, { data: affirmations }, { data: identities }] = await Promise.all([
    supabase.from("life_areas").select("id,name").order("sort_order"),
    supabase.from("affirmations").select("id,text,active,area_id").order("sort_order").order("created_at"),
    supabase.from("identities").select("id,statement,area_id").eq("archived", false).order("sort_order").order("created_at"),
  ]);
  const areaName = (id: string | null) => areas?.find((a) => a.id === id)?.name;
  const priv = await loadPrivacy(supabase);
  const SECTIONS = [
    ["transactions", "Transaksi & arus kas"],
    ["wallets", "Saldo dompet"],
    ["savings", "Tabungan"],
    ["assets", "Aset"],
    ["debts", "Hutang & piutang"],
    ["net_worth", "Net worth"],
  ] as const;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Pengaturan</h1>

      <form action={saveProfile} className="flex flex-col gap-6">
        <Section title="Profil">
          <Field label="Nama panggilan"><input name="display_name" defaultValue={profile.display_name ?? ""} className="field" /></Field>
          <Field label="Zona waktu">
            <select name="timezone" defaultValue={profile.timezone} className="field">
              {ZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Modul aktif">
          {(["task", "keuangan", "life", "tracks"] as const).map((m) => (
            <label key={m} className="flex min-h-12 items-center justify-between border-t border-line-soft first:border-t-0">
              <span>{({ task: "Task", keuangan: "Keuangan", life: "Manifestasi", tracks: "Tracks" } as Record<string, string>)[m]}</span>
              <input type="checkbox" name={`mod_${m}`} defaultChecked={profile.enabled_modules[m] !== false} className="size-5 accent-[var(--accent)]" />
            </label>
          ))}
        </Section>

        <Section title="Tampilan">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs text-muted">Tema</legend>
            <div className="flex gap-2">
              {[["light", "Terang"], ["dark", "Gelap"], ["system", "Ikut sistem"]].map(([v, l]) => (
                <label key={v} className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-line text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-semibold">
                  <input type="radio" name="theme" value={v} defaultChecked={profile.theme === v} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs text-muted">Warna aksen</legend>
            <div className="flex gap-3">
              {ACCENTS.map(([c, l]) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="accent_color" value={c} defaultChecked={profile.accent_color.toLowerCase() === c.toLowerCase()} className="peer sr-only" />
                  <span aria-label={l} className="block size-9 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2" style={{ background: c }} />
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Privasi keuangan">
          <Field label="Nominal tersembunyi lagi setelah">
            <select name="auto_lock_minutes" defaultValue={profile.auto_lock_minutes} className="field">
              {[1, 5, 15, 30].map((m) => <option key={m} value={m}>{m} menit</option>)}
            </select>
          </Field>
        </Section>

        <button className="btn btn-primary min-h-12 self-start px-6">Simpan pengaturan</button>
      </form>

      <form action={savePrivacy}>
        <Section title="Nominal yang disembunyikan">
          <p className="text-sm text-muted">Bagian “Tersembunyi” tampil sebagai Rp •••••• sampai kamu mengetuk ikon mata.</p>
          {SECTIONS.map(([key, label]) => (
            <label key={key} className="flex min-h-12 items-center justify-between gap-3 border-t border-line-soft">
              <span>{label}</span>
              <select name={`p_${key}`} defaultValue={priv[key] ? "hidden" : "visible"} className="field w-40">
                <option value="visible">Tampil</option>
                <option value="hidden">Tersembunyi</option>
              </select>
            </label>
          ))}
          <button className="btn self-start">Simpan privasi</button>
        </Section>
      </form>

      <Section title="Identitas" id="identitas">
        <p className="text-sm text-muted">“Aku adalah orang yang…”. Bisa dipakai sebagai sumber blok Afirmasi dan dikelola lengkap di modul Manifestasi.</p>
        <ul className="flex flex-col">
          {identities?.map((i) => (
            <li key={i.id} className="flex min-h-12 items-center gap-3 border-t border-line-soft first:border-t-0">
              <span className="flex-1">{i.statement}{areaName(i.area_id) && <span className="ml-2 text-xs text-muted">· {areaName(i.area_id)}</span>}</span>
              <form action={deleteIdentity.bind(null, i.id)}><button aria-label="Hapus identitas" className="btn size-9 px-0 text-neg"><Trash2 size={15} aria-hidden /></button></form>
            </li>
          ))}
        </ul>
        <form action={addIdentity} className="flex flex-wrap gap-2">
          <label className="min-w-[220px] flex-[3]"><span className="sr-only">Pernyataan identitas</span><input name="statement" placeholder="Aku adalah peneliti yang menulis setiap hari" className="field" /></label>
          <AreaSelect areas={areas ?? []} />
          <button className="btn">Tambah</button>
        </form>
      </Section>

      <Section title="Afirmasi" id="afirmasi">
        <ul className="flex flex-col">
          {affirmations?.map((a) => (
            <li key={a.id} className="flex min-h-12 items-center gap-3 border-t border-line-soft first:border-t-0">
              <span className={`flex-1 ${a.active ? "" : "text-muted line-through"}`}>{a.text}{areaName(a.area_id) && <span className="ml-2 text-xs text-muted no-underline">· {areaName(a.area_id)}</span>}</span>
              <form action={toggleAffirmation.bind(null, a.id, !a.active)}><button className="btn min-h-9 text-xs">{a.active ? "Nonaktifkan" : "Aktifkan"}</button></form>
              <form action={deleteAffirmation.bind(null, a.id)}><button aria-label="Hapus afirmasi" className="btn size-9 px-0 text-neg"><Trash2 size={15} aria-hidden /></button></form>
            </li>
          ))}
        </ul>
        <form action={addAffirmation} className="flex flex-wrap gap-2">
          <label className="min-w-[220px] flex-[3]"><span className="sr-only">Afirmasi baru</span><input name="text" placeholder="Setiap jam belajar mendekatkanku ke S2" className="field" /></label>
          <AreaSelect areas={areas ?? []} />
          <button className="btn">Tambah</button>
        </form>
      </Section>

      <ReplayWelcome />

      <form action="/auth/signout" method="post">
        <button className="btn text-neg">Keluar</button>
      </form>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className="flex scroll-mt-6 flex-col gap-2">
      <h2 className="text-xs font-bold tracking-wide text-muted uppercase">{title}</h2>
      <div className="card flex flex-col gap-3 px-4 py-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function AreaSelect({ areas }: { areas: { id: string; name: string }[] }) {
  return (
    <label className="min-w-[140px] flex-1">
      <span className="sr-only">Area hidup</span>
      <select name="area_id" className="field">
        <option value="">Tanpa area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </label>
  );
}
