"use client";

import { savePushSubscription, deletePushSubscription } from "@/lib/push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone/iPad hanya bisa menerima notifikasi bila Setapak dipasang ke layar utama. */
export const needsInstallOnIOS = () =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Minta izin + daftarkan perangkat ini. Mengembalikan pesan error bila gagal. */
export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return needsInstallOnIOS() ? "Di iPhone, pasang Setapak ke layar utama dulu (Bagikan → Tambah ke Layar Utama)." : "Browser ini belum mendukung notifikasi.";
  if (!VAPID) return "Notifikasi belum disiapkan di server (VAPID key belum diisi).";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Izin notifikasi ditolak. Bisa diizinkan lagi dari pengaturan browser.";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
  const res = await savePushSubscription(sub.toJSON() as never, navigator.userAgent);
  return res?.error ?? null;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription(sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
}

export async function isPushOn() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}
