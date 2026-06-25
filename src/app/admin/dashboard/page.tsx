"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AdminShell } from "@/components/admin/shell";
import { NetMark } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMe, getAdminDashboard } from "@/api";
import { ghsp } from "@/lib/data";

const NETWORK_LABELS: Record<string, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
};

const PERIOD_OPTIONS = ["today", "7d", "30d"] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDay() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: meData } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const { data: dashboard, isLoading } = useQuery({
    queryKey: getAdminDashboard.key(period),
    queryFn: () => getAdminDashboard.fn(period),
  });

  const displayName = meData?.user?.businessName ?? meData?.user?.email ?? "Admin";
  const pendingCount = dashboard?.pendingOrdersCount ?? 0;

  const chartPoints = dashboard?.revenueChart ?? [];
  const chartTotal = chartPoints.reduce((sum: number, p: { amountGhs: number }) => sum + p.amountGhs, 0);

  return (
    <AdminShell>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap gap-3 items-start justify-between mb-6">
          <div>
            <div className="text-[13px] text-[var(--ink-500)] font-semibold">{formatDay()}</div>
            <h1 className="bh-display text-[28px] md:text-[36px] tracking-[-0.03em] mt-1 mb-0">
              {greeting()}, {displayName.split(" ")[0]}.
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" className="rounded-full gap-1.5">
              <Link href="/admin/bundles">
                <Icon name="package" size={14} /> New bundle
              </Link>
            </Button>
            <Button asChild className="rounded-full gap-1.5 bg-[var(--ink-900)] hover:bg-[var(--ink-800)]">
              <Link href="/admin/orders">
                View pending ({isLoading ? "…" : pendingCount}) <Icon name="arrow-right" size={14} />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Pending orders",    value: isLoading ? "—" : String(pendingCount),                  accent: "var(--bh-accent-500)" },
            { label: "Today's revenue",   value: isLoading ? "—" : ghsp(dashboard?.todayRevenue ?? 0),    accent: "var(--brand-500)" },
            { label: "Paid orders today", value: isLoading ? "—" : String(dashboard?.ordersToday ?? 0),   accent: "var(--ink-900)" },
            { label: "All-time revenue",  value: isLoading ? "—" : ghsp(dashboard?.allTimeRevenue ?? 0),  accent: "var(--ok)" },
          ].map((s) => (
            <Card key={s.label} className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: s.accent }} />
              <div className="text-xs text-[var(--ink-500)] font-semibold uppercase tracking-wide">{s.label}</div>
              <div className="bh-display text-[24px] md:text-[32px] tracking-[-0.02em] mt-1.5">{s.value}</div>
            </Card>
          ))}
        </div>

        {(isLoading || dashboard !== undefined) && (
          <div className="mt-3">
            <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "var(--ok)" }} />
              <div className="text-xs text-[var(--ink-500)] font-semibold uppercase tracking-wide mb-3">Gross profit — completed orders</div>
              {isLoading ? (
                <div className="h-6 w-40 bg-[var(--ink-100)] rounded animate-pulse" />
              ) : dashboard?.profit ? (
                <div className="flex flex-wrap gap-6">
                  {(["guest", "vendor"] as const).map((channel) => {
                    const p = dashboard.profit![channel];
                    const pct = p.revenue > 0 ? ((p.margin / p.revenue) * 100).toFixed(1) : "0";
                    return (
                      <div key={channel} className="flex items-baseline gap-2">
                        <span className="text-xs text-[var(--ink-500)] font-semibold uppercase tracking-wide">{channel}</span>
                        <span className="bh-display text-[20px] tracking-[-0.02em]" style={{ color: p.margin >= 0 ? "var(--ok)" : "var(--err)" }}>
                          {ghsp(p.margin)}
                        </span>
                        <span className="text-xs text-[var(--ink-500)]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--ink-500)] m-0">Sync bundles from Jaybart to populate cost data.</p>
              )}
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mt-4">
          <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <div className="text-xs text-[var(--ink-500)] font-semibold uppercase tracking-wide">
                  {period === "today" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days"}
                </div>
                <div className="bh-display text-[24px] md:text-[28px]">
                  {isLoading ? "—" : ghsp(chartTotal)}
                </div>
              </div>
              <div className="flex gap-0.5 p-0.5 border border-[var(--ink-200)] rounded-full">
                {PERIOD_OPTIONS.map((t) => (
                  <Button
                    key={t}
                    onClick={() => setPeriod(t)}
                    className={`rounded-full px-2.5 py-1 h-auto text-xs font-semibold gap-0 ${
                      period === t
                        ? "bg-[var(--ink-900)] text-white hover:bg-[var(--ink-800)]"
                        : "bg-transparent text-[var(--ink-500)] hover:bg-transparent hover:text-[var(--ink-700)]"
                    }`}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-6 h-[160px] md:h-[180px] w-full">
              {isLoading ? (
                <div className="flex items-end gap-1.5 h-full">
                  {Array.from({ length: period === "today" ? 12 : 7 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-t-[4px] bg-[var(--ink-100)] animate-pulse" style={{ height: `${30 + (i % 4) * 15}%` }} />
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey={period === "today" ? "hour" : "date"}
                      tickFormatter={period === "today" ? formatHour : formatDateShort}
                      tick={{ fontSize: 11, fill: "var(--ink-500)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ stroke: "var(--ink-300)", strokeWidth: 1 }}
                      formatter={(value) => [ghsp(Number(value ?? 0)), "Revenue"]}
                      labelFormatter={(label) =>
                        period === "today" ? formatHour(label as number) : formatDate(label as string)
                      }
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--ink-200)",
                        fontSize: 12,
                        background: "var(--background)",
                        color: "var(--ink-900)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amountGhs"
                      stroke="var(--brand-500)"
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--brand-500)", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="flex justify-between items-center">
              <div className="font-bold text-base">Pending queue</div>
              <Link href="/admin/orders" className="text-[13px] text-[var(--brand-500)] font-semibold no-underline">
                View all
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 mt-3.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[62px] rounded-xl bg-[var(--ink-100)] animate-pulse" />
                ))
              ) : (dashboard?.pendingQueue ?? []).length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--ink-500)]">No pending orders</div>
              ) : (
                (dashboard?.pendingQueue ?? []).map((o) => (
                  <div key={o._id} className="flex items-center gap-3 p-3 border border-[var(--ink-200)] rounded-xl">
                    <NetMark network={o.networkSnapshot.toUpperCase()} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold">{o.bundleNameSnapshot}</div>
                      <div className="bh-mono text-xs text-[var(--ink-500)]">
                        {o.customerPhone} · {o.reference}
                      </div>
                    </div>
                    <div className="bh-mono text-[13px] font-semibold">{ghsp(o.amountGhs)}</div>
                  </div>
                ))
              )}
            </div>
            <Button asChild className="w-full rounded-full mt-3.5 gap-1.5 ">
              <Link href="/admin/orders">
                Process queue <Icon name="arrow-right" size={14} />
              </Link>
            </Button>
          </Card>
        </div>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mt-4">
          <div className="font-bold text-base mb-4">Today by network</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[80px] rounded-xl bg-[var(--ink-100)] animate-pulse" />
                ))
              : (["mtn", "telecel", "airteltigo"] as const).map((net) => {
                  const data = dashboard?.todayByNetwork?.find((n) => n.network === net);
                  return (
                    <div key={net} className="p-4 border border-[var(--ink-200)] rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <NetMark network={net.toUpperCase()} size="sm" />
                        <div className="font-bold text-sm">{NETWORK_LABELS[net]}</div>
                      </div>
                      <div className="bh-display text-[22px] mt-2">
                        {data ? ghsp(data.revenue) : "GHS 0.00"}
                      </div>
                      <div className="text-xs text-[var(--ink-500)]">
                        {data?.orderCount ?? 0} order{(data?.orderCount ?? 0) !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
