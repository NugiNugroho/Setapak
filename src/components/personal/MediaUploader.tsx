"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { compressImage, extOf, uploadFile } from "@/lib/upload";
import { registerMedia } from "@/app/(app)/media/actions";

/** Unggah foto sampul atau lagu ke daftar media milik user. */
export function MediaUploader({ kind, label }: { kind: "cover" | "audio"; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    let ok = 0;
    for (const [i, file] of Array.from(files).entries()) {
      setStatus(`Mengunggah ${i + 1} dari ${files.length}…`);
      try {
        if (kind === "audio") {
          if (file.size > 25 * 1024 * 1024) throw new Error("Maksimal 25 MB per lagu");
          const path = await uploadFile(file, "audio", extOf(file, "mp3"));
          await registerMedia("audio", path, { title: file.name.replace(/\.[^.]+$/, ""), mime: file.type, size: file.size });
        } else {
          const blob = await compressImage(file, 2000, 0.82);
          const path = await uploadFile(blob, "cover", blob === file ? extOf(file, "jpg") : "jpg");
          await registerMedia("cover", path, { mime: blob.type, size: blob.size });
        }
        ok++;
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Gagal mengunggah");
        return;
      }
    }
    setStatus(`${ok} file terunggah.`);
    if (ref.current) ref.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="btn cursor-pointer">
        <Upload size={16} aria-hidden />
        {label}
        <input
          ref={ref}
          type="file"
          multiple
          accept={kind === "audio" ? "audio/*" : "image/*"}
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {status && <span className="text-sm text-muted" role="status">{status}</span>}
    </div>
  );
}
