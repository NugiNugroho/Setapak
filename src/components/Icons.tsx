import {
  Home, SquareCheck, Wallet, Sparkles, Activity, CalendarDays, Settings, Plus, Eye, EyeOff,
  Ellipsis, type LucideIcon,
} from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon; module?: string }[] = [
  { href: "/", label: "Hari Ini", icon: Home },
  { href: "/task", label: "Task", icon: SquareCheck, module: "task" },
  { href: "/keuangan", label: "Keuangan", icon: Wallet, module: "keuangan" },
  { href: "/manifestasi", label: "Manifestasi", icon: Sparkles, module: "life" },
  { href: "/tracks", label: "Tracks", icon: Activity, module: "tracks" },
  { href: "/review", label: "Weekly Review", icon: CalendarDays },
];

export { Settings, Plus, Eye, EyeOff, Ellipsis, Home, SquareCheck, Wallet };
