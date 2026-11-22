export const metadata = { title: "Offline" };
export default function Offline() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-bold">Sedang offline</h1>
        <p className="text-sm text-muted">Sambungkan internet untuk melanjutkan. Datamu tetap aman.</p>
      </div>
    </main>
  );
}
