const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const HIDDEN_AMOUNT = "Rp ••••••";

export function formatRupiah(amount: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign ? (amount > 0 ? "+" : amount < 0 ? "−" : "") : amount < 0 ? "−" : "";
  return `${sign}Rp ${rupiah.format(Math.abs(amount))}`;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}j ${m}m` : `${h}j`;
}
