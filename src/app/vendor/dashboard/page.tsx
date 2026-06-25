"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { VendorShell } from "@/components/vendor/shell";
import { NetMark } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { NETWORKS, ghsp } from "@/lib/data";
import { getMe, getVendorDashboard } from "@/api";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VendorDashboardPage() {
  const { data: meData } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const { data: dashboard, isLoading } = useQuery({
    queryKey: getVendorDashboard.key,
    queryFn: getVendorDashboard.fn,
  });

  const user = meData?.user;
  const displayName = user?.businessName ?? user?.email ?? "—";

  return (
    <VendorShell
      walletBalance={user?.walletBalance ?? 0}
      vendorName={displayName}
      vendorEmail={user?.email ?? ""}
    >
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[960px] mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="bh-display text-[24px] md:text-[28px] tracking-[-0.02em] mb-1">
            {greeting()}, {displayName}
          </h1>
          <p className="text-[var(--ink-500)] text-sm m-0">Here&apos;s an overview of your account.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">Wallet balance</div>
            <div className="bh-display text-[22px] md:text-[26px] tracking-[-0.02em]">
              {isLoading ? "—" : ghsp(dashboard?.walletBalance ?? 0)}
            </div>
            <Link href="/vendor/wallet" className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold text-[var(--brand-500)] no-underline">
              Top up <Icon name="arrow-right" size={12} />
            </Link>
          </Card>

          <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">Spent this month</div>
            <div className="bh-display text-[22px] md:text-[26px] tracking-[-0.02em]">
              {isLoading ? "—" : ghsp(dashboard?.spentThisMonth ?? 0)}
            </div>
            <div className="mt-2.5 text-xs text-[var(--ink-500)]">
              {dashboard?.monthlyOrderCount ?? 0} order{(dashboard?.monthlyOrderCount ?? 0) !== 1 ? "s" : ""}
            </div>
          </Card>

          <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">Pending orders</div>
            <div className="bh-display text-[22px] md:text-[26px] tracking-[-0.02em]">
              {isLoading ? "—" : (dashboard?.pendingOrdersCount ?? 0)}
            </div>
            <Link href="/vendor/orders" className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold text-[var(--brand-500)] no-underline">
              View orders <Icon name="arrow-right" size={12} />
            </Link>
          </Card>
        </div>

        <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)] mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="font-bold text-[15px]">Quick buy</div>
            <span className="text-[13px] text-[var(--ink-500)]">Pick a network to browse bundles</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {NETWORKS.map(n => (
              <Link
                key={n.id}
                href={`/bundles/${n.id.toLowerCase()}`}
                className="p-3 md:p-3.5 border border-[var(--ink-200)] rounded-xl flex flex-col items-center gap-2 md:gap-2.5 no-underline hover:border-[var(--brand-300)] transition-colors"
              >
                <NetMark network={n.id} size="md" />
                <span className="text-xs font-bold text-[var(--ink-900)]">{n.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-[15px]">Recent orders</div>
            <Link href="/vendor/orders" className="text-[13px] font-semibold text-[var(--brand-500)] no-underline">
              See all
            </Link>
          </div>

          {!isLoading && (dashboard?.recentOrders.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-[var(--ink-500)] text-sm">
              No orders yet. Buy a bundle to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--ink-100)] hover:bg-transparent">
                    {["Reference", "Network", "Bundle", "Amount", "Status", "Date"].map(h => (
                      <TableHead key={h} className="px-3 py-2 text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide h-auto whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.recentOrders ?? []).map(o => (
                    <TableRow key={o._id} className="border-b border-[var(--ink-50)] hover:bg-[var(--ink-50)]/50">
                      <TableCell className="px-3 py-3">
                        <span className="bh-mono text-[13px] font-semibold">{o.reference}</span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <NetMark network={o.networkSnapshot.toUpperCase()} size="sm" />
                      </TableCell>
                      <TableCell className="px-3 py-3 text-[13px] text-[var(--ink-700)] whitespace-nowrap">{o.bundleNameSnapshot}</TableCell>
                      <TableCell className="px-3 py-3">
                        <span className="bh-mono text-[13px] font-semibold whitespace-nowrap">{ghsp(o.amountGhs)}</span>
                      </TableCell>
                      <TableCell className="px-3 py-3"><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="px-3 py-3 text-xs text-[var(--ink-500)] whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </VendorShell>
  );
}
