import {
  Home, SquareCheck, Wallet, Sparkles, Activity, CalendarDays, Settings, Plus, Eye, EyeOff,
  Ellipsis, Images, Gift, type LucideIcon,
} from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon; module?: string; key?: string }[] = [
  { href: "/", label: "Hari Ini", icon: Home },
  { href: "/task", label: "Task", icon: SquareCheck, module: "task", key: "task" },
  { href: "/keuangan", label: "Keuangan", icon: Wallet, module: "keuangan", key: "keuangan" },
  { href: "/manifestasi", label: "Manifestasi", icon: Sparkles, module: "life", key: "life" },
  { href: "/tracks", label: "Tracks", icon: Activity, module: "tracks", key: "tracks" },
  { href: "/review", label: "Weekly Review", icon: CalendarDays, key: "review" },
  { href: "/jejak", label: "Galeri Jejak", icon: Images },
  { href: "/rangkuman", label: "Rangkuman Tahunan", icon: Gift },
];

export { Settings, Plus, Eye, EyeOff, Ellipsis, Home, SquareCheck, Wallet };
