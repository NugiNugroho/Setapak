/**
 * Pustaka musik bawaan Setapak.
 *
 * Aturan: hanya musik berlisensi CC0 (domain publik) yang boleh ditaruh di sini,
 * supaya aman disertakan di dalam aplikasi tanpa kewajiban kredit/izin.
 * Kredit tetap ditampilkan di halaman Tentang sebagai bentuk apresiasi.
 *
 * Cara menambah lagu:
 * 1. Unduh lagu CC0 (mis. dari HoliznaCC0 di freemusicarchive.org / opengameart.org).
 * 2. Simpan sebagai MP3 kecil (±3–5 MB) di folder public/music/.
 * 3. Tambahkan satu baris di LIBRARY di bawah.
 */
export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  file: string; // path di /public, mis. "/music/lofi-1.mp3"
  license: "CC0 1.0";
  source: string; // halaman asal lagu
};

export const LIBRARY: LibraryTrack[] = [
  // { id: "winter-lofi-1", title: "Judul Lagu", artist: "HoliznaCC0", file: "/music/winter-lofi-1.mp3", license: "CC0 1.0", source: "https://freemusicarchive.org/music/holiznacc0/winter-lofi" },
];

/** Suara latar yang dibuat langsung oleh aplikasi (tanpa file, tanpa hak cipta). */
export const AMBIENT = [
  { id: "rain", title: "Hujan" },
  { id: "waves", title: "Ombak" },
  { id: "brown", title: "Brown noise" },
] as const;
