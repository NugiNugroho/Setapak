import { Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { PageHeader, Card, Empty } from "@/components/ui";
import { LifeNav } from "@/components/life/LifeNav";
import { addScorecard, setScorecardRating, deleteScorecard } from "../actions";

export const metadata = { title: "Habits Scorecard" };

const RATING = [
  ["+", "Baik", "bg-accent text-on-accent"],
  ["=", "Netral", "bg-ink-2 text-surface"],
  ["-", "Buruk", "bg-neg text-white"],
] as const;

export default async function Scorecard() {
  const { supabase } = await requireProfile();
  const { data } = await supabase.from("scorecard_items").select("*").order("sort_order").order("created_at");
  const items = data ?? [];
  const count = (r: string) => items.filter((i) => i.rating === r).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Manifestasi" title="Habits Scorecard" />
      <LifeNav current="scorecard" />
      <Card title="Rutinitasmu hari ini, apa adanya" aside={`${count("+")} baik · ${count("=")} netral · ${count("-")} buruk`}>
        <p className="text-sm text-ink-2">Tulis rutinitas harian dari bangun sampai tidur, lalu tandai: apakah ini membawamu ke orang yang ingin kamu jadi (+), menjauhkan (−), atau netral (=)? Kesadaran datang sebelum perubahan.</p>
        <ol className="flex flex-col">
          {items.map((i, idx) => (
            <li key={i.id} className="flex min-h-12 items-center gap-2 border-t border-line-soft first:border-t-0">
              <span className="w-6 text-xs text-muted">{idx + 1}</span>
              <span className="flex-1">{i.routine}</span>
              <div role="radiogroup" aria-label={`Nilai ${i.routine}`} className="flex gap-1">
                {RATING.map(([r, l, on]) => (
                  <form key={r} action={setScorecardRating.bind(null, i.id, r)}>
                    <button role="radio" aria-checked={i.rating === r} aria-label={l} className={`flex size-9 items-center justify-center rounded-lg text-sm font-bold ${i.rating === r ? on : "border border-line text-muted"}`}>{r === "-" ? "−" : r}</button>
                  </form>
                ))}
              </div>
              <form action={deleteScorecard.bind(null, i.id)}><button aria-label="Hapus" className="flex size-9 items-center justify-center text-muted hover:text-neg"><Trash2 size={14} aria-hidden /></button></form>
            </li>
          ))}
        </ol>
        {!items.length && <Empty>Mulai dengan “Bangun tidur”, “Cek HP”, “Mandi”…</Empty>}
        <form action={addScorecard} className="flex flex-wrap gap-2 border-t border-line-soft pt-3">
          <label className="min-w-[200px] flex-[3]"><span className="sr-only">Rutinitas</span><input name="routine" required placeholder="Cek HP begitu bangun" className="field" /></label>
          <label className="flex-1"><span className="sr-only">Nilai</span><select name="rating" className="field"><option value="=">= Netral</option><option value="+">+ Baik</option><option value="-">− Buruk</option></select></label>
          <button className="btn">Tambah</button>
        </form>
      </Card>
    </div>
  );
}
