import { Badge } from "@/components/ui/badge";

type Status = "PENDING" | "PENDING_PAYMENT" | "PAID" | "FULFILLING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";

const config: Record<Status, { dotColor: string; label: string; className: string }> = {
  PENDING:         { dotColor: "var(--warn)",  label: "Pending",         className: "bg-[var(--warn-bg)] text-[oklch(0.45_0.16_80)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  PENDING_PAYMENT: { dotColor: "var(--warn)",  label: "Pending payment", className: "bg-[var(--warn-bg)] text-[oklch(0.45_0.16_80)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  PAID:            { dotColor: "var(--info)",  label: "Paid",            className: "bg-[var(--info-bg)] text-[oklch(0.45_0.18_250)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  FULFILLING:      { dotColor: "var(--brand-500)", label: "Sending…",    className: "bg-[var(--brand-50)] text-[var(--brand-600)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  COMPLETED:       { dotColor: "var(--ok)",    label: "Completed",       className: "bg-[var(--ok-bg)] text-[oklch(0.40_0.18_150)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  FAILED:          { dotColor: "var(--err)",   label: "Failed",          className: "bg-[var(--err-bg)] text-[oklch(0.45_0.20_25)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  CANCELLED:       { dotColor: "var(--err)",   label: "Cancelled",       className: "bg-[var(--err-bg)] text-[oklch(0.45_0.20_25)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
  REFUNDED:        { dotColor: "var(--info)",  label: "Refunded",        className: "bg-[var(--info-bg)] text-[oklch(0.45_0.18_250)] border-transparent rounded-full px-2.5 py-1 h-auto text-xs font-semibold" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = config[status.toUpperCase() as Status] ?? config.PENDING;
  return (
    <Badge className={c.className}>
      <span className="size-1.5 rounded-full" style={{ background: c.dotColor }} />
      {c.label}
    </Badge>
  );
}
