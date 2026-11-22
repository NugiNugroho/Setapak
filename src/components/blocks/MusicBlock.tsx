import { BlockCard } from "./BlockCard";

/** Ubah tautan Spotify/YouTube biasa menjadi tautan embed. */
export function toEmbed(url: string): { src: string; height: number } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("spotify.com")) {
      const m = u.pathname.match(/\/(playlist|album|track|show|episode|artist)\/([A-Za-z0-9]+)/);
      if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" ? 152 : 352 };
    }
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const list = u.searchParams.get("list");
      const v = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (list) return { src: `https://www.youtube.com/embed/videoseries?list=${list}`, height: 220 };
      if (v) return { src: `https://www.youtube.com/embed/${v}`, height: 220 };
    }
  } catch {}
  return null;
}

export function MusicBlock({ title, url }: { title: string; url: string }) {
  const embed = url ? toEmbed(url) : null;
  return (
    <BlockCard title={title}>
      {embed ? (
        <iframe
          title={title}
          src={embed.src}
          height={embed.height}
          className="w-full rounded-xl border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : (
        <p className="text-sm text-muted">Tempel tautan playlist Spotify atau YouTube lewat <b>Atur dashboard</b>.</p>
      )}
    </BlockCard>
  );
}
