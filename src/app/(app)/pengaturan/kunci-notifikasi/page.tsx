import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { VapidGenerator } from "./VapidGenerator";

export const metadata = { title: "Kunci notifikasi" };

export default function KunciNotifikasi() {
  const ready = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader eyebrow={<Link href="/pengaturan" className="font-semibold text-accent">‹ Pengaturan</Link>} title="Kunci notifikasi" />
      {ready && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">Kunci VAPID sudah terpasang di server. Halaman ini hanya perlu dipakai bila ingin mengganti kunci.</p>}
      <Card title="1 · Buat kunci">
        <p className="text-sm text-muted">Kunci dibuat langsung di browser ini dan tidak dikirim ke mana pun.</p>
        <VapidGenerator />
      </Card>
      <Card title="2 · Pasang di Vercel">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2">
          <li>Buka project Setapak di vercel.com → <b>Settings → Environment Variables</b>.</li>
          <li>Tambahkan tiga variabel di atas (nama & isi persis), centang Production, Preview, Development.</li>
          <li>Buka tab <b>Deployments</b> → titik tiga di deployment teratas → <b>Redeploy</b>.</li>
        </ol>
      </Card>
      <Card title="3 · Jadwalkan pengiriman di Supabase">
        <p className="text-sm text-ink-2">Buka file <code>supabase/setup/push-cron.sql</code> di GitHub, salin isinya ke Supabase <b>SQL Editor</b>, ganti <code>GANTI_TOKEN</code> dengan isi CRON_SECRET dan <code>GANTI_URL</code> dengan alamat aplikasimu, lalu <b>Run</b>.</p>
      </Card>
    </div>
  );
}
