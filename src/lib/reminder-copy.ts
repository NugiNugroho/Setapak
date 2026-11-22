/** Kalimat pengingat: hangat, pendek, berganti tiap hari supaya tidak membosankan. */
const MORNING = [
  "Selamat pagi, {nama}. Pilih 3 langkah untuk hari ini.",
  "Pagi, {nama}! Satu langkah kecil dulu, sisanya menyusul.",
  "Hari baru, jejak baru. Apa 3 prioritasmu hari ini, {nama}?",
  "Selamat pagi, {nama}. Mulai dari yang paling kecil saja.",
];
const EVENING = [
  "Sebelum istirahat, {nama}: centang habit & tulis satu syukur.",
  "Hari ini sudah sampai mana, {nama}? Lihat jejakmu sebentar.",
  "Tutup hari dengan tenang, {nama}. Rencanakan satu langkah untuk besok.",
  "Malam, {nama}. Tidak perlu sempurna, cukup jangan bolong dua kali.",
];

export function reminderMessage(kind: "morning" | "evening", name: string, openTasks: number, habitsLeft: number, dayNo: number) {
  const list = kind === "morning" ? MORNING : EVENING;
  let body = list[dayNo % list.length].replace(/\{nama\}/g, name);
  if (kind === "morning" && openTasks > 0) body += ` Ada ${openTasks} task menunggu.`;
  if (kind === "evening" && habitsLeft > 0) body += ` ${habitsLeft} habit belum dicentang.`;
  return {
    title: kind === "morning" ? "Ritual pagi · Setapak" : "Ritual malam · Setapak",
    body,
    url: `/?ritual=${kind === "morning" ? "pagi" : "malam"}`,
    tag: `setapak-${kind}`,
  };
}
