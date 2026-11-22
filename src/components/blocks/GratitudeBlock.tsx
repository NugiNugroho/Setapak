"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addGratitude, deleteJournal } from "@/app/(app)/actions";
import { BlockCard } from "./BlockCard";

export function GratitudeBlock({ title, entries, count }: { title: string; entries: { id: string; body: string }[]; count: number }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <BlockCard title={title} aside={`${Math.min(entries.length, count)}/${count}`}>
      <ol className="flex flex-col gap-2">
        {entries.map((e, i) => (
          <li key={e.id} className="group flex items-start gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2.5">
            <span className="font-bold text-accent">{i + 1}</span>
            <span className="flex-1">{e.body}</span>
            <button aria-label="Hapus" onClick={() => start(() => deleteJournal(e.id))} className="text-muted opacity-60 hover:opacity-100">
              <X size={15} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      {entries.length < count && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = value;
            setValue("");
            start(() => addGratitude(v));
          }}
          className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-line px-3"
        >
          <span className="font-bold text-muted">{entries.length + 1}</span>
          <label className="flex-1">
            <span className="sr-only">Hal yang disyukuri</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending}
              placeholder="Tulis satu hal…"
              className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted"
            />
          </label>
        </form>
      )}
    </BlockCard>
  );
}
