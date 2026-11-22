"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { compressImage, uploadFile } from "@/lib/upload";

/**
 * Input gambar untuk form server: unggah langsung ke storage, lalu menyimpan
 * path-nya di input tersembunyi `name`.
 */
export function ImageField({ name, kind, initialUrl, initialPath, label = "Tambah foto" }: {
  name: string;
  kind: "vision" | "journal";
  initialUrl?: string | null;
  initialPath?: string | null;
  label?: string;
}) {
  const [path, setPath] = useState(initialPath ?? "");
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await compressImage(file, 1600, 0.82);
      setPreview(URL.createObjectURL(blob));
      setPath(await uploadFile(blob, kind, "jpg"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengunggah");
      setPreview("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={path} />
      {preview ? (
        <div className="relative w-fit">
          <img src={preview} alt="Pratinjau foto" className={`h-28 rounded-xl object-cover ${busy ? "opacity-50" : ""}`} />
          <button type="button" aria-label="Hapus foto" onClick={() => { setPath(""); setPreview(""); }} className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-ink text-bg">
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : (
        <label className="btn w-fit cursor-pointer text-sm">
          <ImagePlus size={16} aria-hidden />{label}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
      {busy && <span className="text-xs text-muted">Mengunggah…</span>}
      {err && <span className="text-xs text-neg">{err}</span>}
    </div>
  );
}
