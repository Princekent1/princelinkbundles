import { NETWORKS, getNetwork } from "@/lib/data";
import { TelcoLogo } from "./network-icons";

type SizeVariant = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<SizeVariant, { px: number; radius: number }> = {
  xs: { px: 24, radius: 6 },
  sm: { px: 36, radius: 10 },
  md: { px: 56, radius: 12 },
  lg: { px: 72, radius: 18 },
};

const bgMap: Record<string, string> = {
  MTN:        "var(--net-mtn)",
  TELECEL:    "white",
  AIRTELTIGO: "white",
  ISHARE:     "white",
  BIGTIME:    "white",
};

export function NetMark({ network, size = "md" }: { network: string; size?: SizeVariant }) {
  const { px, radius } = sizeMap[size];
  const bg = bgMap[network] ?? "white";
  const border = network !== "MTN" ? "1px solid var(--ink-200)" : "none";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: px, height: px, borderRadius: radius,
      background: bg, border, flexShrink: 0, overflow: "hidden",
    }}>
      <TelcoLogo network={network} boxSize={px} />
    </span>
  );
}

const chipColors: Record<string, { bg: string; color: string }> = {
  MTN:        { bg: "var(--net-mtn-bg)",        color: "oklch(0.45 0.14 80)" },
  TELECEL:    { bg: "var(--net-telecel-bg)",    color: "oklch(0.42 0.18 25)" },
  AIRTELTIGO: { bg: "var(--net-airteltigo-bg)", color: "oklch(0.40 0.18 264)" },
  ISHARE:     { bg: "var(--net-ishare-bg)",     color: "oklch(0.40 0.18 264)" },
  BIGTIME:    { bg: "var(--net-bigtime-bg)",    color: "oklch(0.40 0.12 195)" },
};

export function NetChip({ network }: { network: string }) {
  const n = getNetwork(network);
  const colors = chipColors[network] ?? chipColors.MTN;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 10px", borderRadius: 8,
      background: colors.bg, color: colors.color,
      fontWeight: 700, fontSize: 12,
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>
      {n.label}
    </span>
  );
}
