"use client";

import { useState, useTransition } from "react";
import { updateBlock } from "@/app/(app)/actions";
import { BlockCard } from "./BlockCard";

export function NoteBlock({ id, title, text }: { id: string; title: string; text: string }) {
  const [value, setValue] = useState(text);
  const [pending, start] = useTransition();
  return (
    <BlockCard title={title} aside={pending ? "Menyimpan…" : undefined}>
      <label>
        <span className="sr-only">{title}</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value !== text && start(() => updateBlock(id, { config: { text: value } }))}
          rows={4}
          placeholder="Tulis apa saja…"
          className="w-full resize-y rounded-[10px] bg-surface-2 p-3 outline-none"
        />
      </label>
    </BlockCard>
  );
}
