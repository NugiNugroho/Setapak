"use client";

import { getUploadUrl } from "@/app/(app)/media/actions";

/** Perkecil foto di perangkat sebelum diunggah (hemat kuota & cepat). */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

/** Unggah langsung ke Supabase Storage lewat URL bertanda tangan. Mengembalikan path. */
export async function uploadFile(blob: Blob, kind: "cover" | "vision" | "journal" | "audio", ext: string) {
  const res = await getUploadUrl(kind, ext);
  if ("error" in res && res.error) throw new Error(res.error);
  const { signedUrl, path, apikey } = res as { signedUrl: string; path: string; apikey: string };
  const put = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      apikey,
      "content-type": blob.type || "application/octet-stream",
      "x-upsert": "false",
      "cache-control": "max-age=31536000",
    },
    body: blob,
  });
  if (!put.ok) throw new Error(`Unggah gagal (${put.status})`);
  return path;
}

export const extOf = (file: File, fallback: string) =>
  (file.name.split(".").pop() || fallback).toLowerCase();
