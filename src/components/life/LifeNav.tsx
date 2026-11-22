import { SubNav } from "@/components/ui";

export function LifeNav({ current }: { current: string }) {
  return (
    <SubNav
      current={current}
      items={[
        { key: "ringkasan", label: "Ringkasan", href: "/manifestasi" },
        { key: "goal", label: "Visi & Goal", href: "/manifestasi/goal" },
        { key: "scorecard", label: "Scorecard", href: "/manifestasi/scorecard" },
        { key: "refleksi", label: "Refleksi", href: "/manifestasi/refleksi" },
      ]}
    />
  );
}
