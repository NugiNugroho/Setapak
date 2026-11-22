import { SubNav } from "@/components/ui";

export function LifeNav({ current }: { current: string }) {
  return (
    <SubNav
      current={current}
      items={[
        { key: "ringkasan", label: "Ringkasan", href: "/life" },
        { key: "goal", label: "Visi & Goal", href: "/life/goal" },
        { key: "scorecard", label: "Scorecard", href: "/life/scorecard" },
        { key: "refleksi", label: "Refleksi", href: "/life/refleksi" },
      ]}
    />
  );
}
