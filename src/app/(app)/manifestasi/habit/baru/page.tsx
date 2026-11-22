import Link from "next/link";
import { X } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { loadHabitFormOptions } from "@/lib/life-form";
import { HabitForm } from "@/components/life/HabitForm";

export const metadata = { title: "Habit baru" };

export default async function NewHabit({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase } = await requireProfile();
  const opts = await loadHabitFormOptions(supabase);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Habit baru</h1>
        <Link href="/manifestasi" aria-label="Tutup" className="btn size-10 px-0"><X size={18} aria-hidden /></Link>
      </header>
      {error && <p className="text-sm text-neg" role="alert">Pilih atau tulis identitas untuk habit ini.</p>}
      <HabitForm habit={null} {...opts} />
    </div>
  );
}
