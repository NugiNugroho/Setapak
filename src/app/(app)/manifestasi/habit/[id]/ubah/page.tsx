import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { loadHabitFormOptions } from "@/lib/life-form";
import { HabitForm } from "@/components/life/HabitForm";
import type { Habit } from "@/lib/habits";

export const metadata = { title: "Ubah habit" };

export default async function EditHabit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const [{ data }, opts] = await Promise.all([supabase.from("habits").select("*").eq("id", id).maybeSingle(), loadHabitFormOptions(supabase)]);
  if (!data) notFound();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ubah habit</h1>
        <Link href={`/manifestasi/habit/${id}`} aria-label="Tutup" className="btn size-10 px-0"><X size={18} aria-hidden /></Link>
      </header>
      <HabitForm habit={data as Habit} {...opts} />
    </div>
  );
}
