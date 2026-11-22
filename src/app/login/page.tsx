import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="card flex w-full max-w-sm flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Logo />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mulai setapak demi setapak</h1>
            <p className="mt-1 text-sm text-muted">Rintik menjadi hujan, setapak menjadi jalan.</p>
          </div>
        </div>
        <LoginForm initialError={error ? "Gagal masuk. Coba lagi." : undefined} />
      </div>
    </main>
  );
}
