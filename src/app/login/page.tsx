import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>;
}) {
  const { error, error_code } = await searchParams;
  const ERR: Record<string, string> = {
    callback: "Tautan konfirmasi sudah dipakai atau dibuka di browser lain. Kalau kamu baru saja konfirmasi email, akunmu sudah aktif: silakan masuk.",
    otp_expired: "Tautan konfirmasi sudah kedaluwarsa. Daftar ulang dengan email yang sama untuk mendapat tautan baru.",
    google: "Gagal masuk dengan Google. Coba lagi.",
  };
  const errMsg = error_code === "otp_expired" ? ERR.otp_expired : error ? ERR[error] ?? "Gagal masuk. Coba lagi." : undefined;
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="card flex w-full max-w-sm flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mulai setapak demi setapak</h1>
            <p className="mt-1 text-sm text-muted">Langkah kecil, jejak panjang.</p>
          </div>
        </div>
        <LoginForm initialError={errMsg} />
      </div>
    </main>
  );
}
