"use client";

import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function randomSecret() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return b64url(a.buffer);
}

/** Membuat kunci VAPID (P-256) di browser. Tidak ada yang dikirim ke server. */
export function VapidGenerator() {
  const [keys, setKeys] = useState<{ pub: string; priv: string; secret: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    try {
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      const pub = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));
      const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
      setKeys({ pub, priv: jwk.d!, secret: randomSecret() });
    } catch {
      setErr("Browser ini tidak bisa membuat kunci. Coba Chrome terbaru.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={generate} className="btn btn-primary self-start">
        <KeyRound size={16} aria-hidden />{keys ? "Buat ulang" : "Buat kunci"}
      </button>
      {err && <p className="text-sm text-neg">{err}</p>}
      {keys && (
        <>
          <Row name="NEXT_PUBLIC_VAPID_PUBLIC_KEY" value={keys.pub} />
          <Row name="VAPID_PRIVATE_KEY" value={keys.priv} secret />
          <Row name="CRON_SECRET" value={keys.secret} secret />
          <p className="text-xs text-muted">Simpan ketiganya sebelum menutup halaman ini; kunci tidak disimpan di mana pun. Kunci privat & CRON_SECRET jangan dibagikan ke siapa pun.</p>
        </>
      )}
    </div>
  );
}

function Row({ name, value, secret }: { name: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-muted">{name}{secret ? " · rahasia" : ""}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-xs whitespace-nowrap">{value}</code>
        <button
          type="button"
          aria-label={`Salin ${name}`}
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn size-10 shrink-0 px-0"
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
