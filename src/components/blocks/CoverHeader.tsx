/* eslint-disable @next/next/no-img-element */
/** Foto sampul dengan sapaan di atasnya. */
export function CoverHeader({ src, date, greeting, actions }: { src: string; date: string; greeting: string; actions: React.ReactNode }) {
  return (
    <header className="relative -mx-4 -mt-6 overflow-hidden md:mx-0 md:mt-0 md:rounded-[20px]">
      <img src={src} alt="" className="h-48 w-full object-cover md:h-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 px-4 pb-4 md:px-6 md:pb-5">
        <div className="flex flex-col gap-0.5 text-white">
          <span className="text-[13px] font-medium opacity-90">{date}</span>
          <h1 className="text-2xl font-bold tracking-tight drop-shadow md:text-[30px]">{greeting}</h1>
        </div>
        <div className="flex gap-2 [&_.btn]:border-white/30 [&_.btn]:bg-white/90 [&_.btn]:text-[#1c1c1a]">{actions}</div>
      </div>
    </header>
  );
}
