"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { NetChip } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ghsp } from "@/lib/data";
import { jaybartSyncToast } from "@/lib/order-status-copy";
import { getAdminOrders, completeOrder, syncAdminOrder, cancelOrder, type AdminOrderItem, type StrippedError } from "@/api";
import toast from "react-hot-toast";

const PAYMENT_BADGE_CLASS = {
  wallet:   "bg-[var(--brand-100)] text-[var(--brand-600)] border-transparent",
  paystack: "bg-[var(--ink-100)] text-[var(--ink-600)] border-transparent",
} as const;

const TABS = [
  { id: "pending",   label: "Pending",   dbKey: "pending_payment" },
  { id: "paid",      label: "Paid",      dbKey: "paid" },
  { id: "completed", label: "Completed", dbKey: "completed" },
  { id: "failed",    label: "Failed",    dbKey: "failed" },
  { id: "cancelled", label: "Cancelled", dbKey: "cancelled" },
  { id: "refunded",  label: "Refunded",  dbKey: "refunded" },
  { id: "all",       label: "All",       dbKey: "all" },
] as const;

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tab        = searchParams.get("status") ?? "all";
  const network    = searchParams.get("network") ?? "all";
  const payment    = searchParams.get("paymentMethod") ?? "all";
  const dateRange  = searchParams.get("dateRange") ?? "7d";
  const page       = parseInt(searchParams.get("page") ?? "1", 10);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [confirmOrder, setConfirmOrder] = useState<AdminOrderItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminOrderItem | null>(null);
  const searchRef = useRef(searchInput);
  searchRef.current = searchInput;

  const params = {
    page,
    status: tab !== "all" ? tab : undefined,
    network: network !== "all" ? network : undefined,
    paymentMethod: payment !== "all" ? payment : undefined,
    dateRange,
    search: searchParams.get("search") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: getAdminOrders.key(params),
    queryFn: () => getAdminOrders.fn(params),
  });

  const { mutate: sendBundle, isPending: isSending } = useMutation({
    mutationFn: (order: AdminOrderItem) => completeOrder.fn(order._id),
    onSuccess: () => {
      toast.success("Bundle sent to Jaybart");
      setConfirmOrder(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) => toast.error((error as StrippedError).message ?? "Could not send bundle to Jaybart"),
  });

  const { mutate: doCancel, isPending: isCancelling } = useMutation({
    mutationFn: (order: AdminOrderItem) => cancelOrder.fn(order._id),
    onSuccess: () => {
      toast.success("Order cancelled");
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => toast.error("Could not cancel order"),
  });

  const { mutate: syncOrder, isPending: isSyncing, variables: syncingOrder } = useMutation({
    mutationFn: (order: AdminOrderItem) => syncAdminOrder.fn(order._id),
    onSuccess: (result) => {
      toast.success(jaybartSyncToast(result.status));
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => toast.error("Failed to sync Jaybart status"),
  });

  function push(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "all") p.delete(k);
      else p.set(k, v);
    }
    if (!("page" in updates)) p.delete("page");
    router.replace(`?${p.toString()}`);
  }

  function submitSearch() {
    push({ search: searchRef.current || undefined });
  }

  function exportVisibleCsv() {
    const orders = data?.orders ?? [];
    if (!orders.length) {
      toast.error("No orders to export");
      return;
    }

    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Reference", "Vendor", "Phone", "Network", "Bundle", "Amount", "Payment", "Status", "Paid"],
      ...orders.map((o) => [
        o.reference,
        o.placedBy?.businessName ?? "Guest",
        o.customerPhone,
        o.networkSnapshot,
        o.bundleNameSnapshot,
        ghsp(o.amountGhs),
        o.paymentMethod,
        o.status,
        o.paidAt ? new Date(o.paidAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = data?.counts ?? {};

  return (
    <AdminShell>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
          <div>
            <h1 className="bh-display text-[28px] md:text-[32px] m-0 tracking-[-0.03em]">Orders</h1>
            <p className="text-[var(--ink-500)] mt-1 mb-0">Send unsent orders or check Jaybart delivery status.</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={isLoading || !(data?.orders ?? []).length}
            onClick={exportVisibleCsv}
          >
            Export visible CSV
          </Button>
        </div>

        <Card className="p-3 md:p-3.5 gap-0 rounded-2xl border-[var(--ink-200)] flex flex-col gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]">
              <Icon name="search" size={16} />
            </span>
            <Input
              placeholder="Search by phone or reference…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitSearch()}
              className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] pl-9 pr-3.5 py-2.5 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={network} onValueChange={v => push({ network: v })}>
              <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-2.5 text-sm flex-1 min-w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All networks</SelectItem>
                <SelectItem value="mtn">MTN</SelectItem>
                <SelectItem value="telecel">Telecel</SelectItem>
                <SelectItem value="airteltigo">AirtelTigo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={payment} onValueChange={v => push({ paymentMethod: v })}>
              <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-2.5 text-sm flex-1 min-w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="paystack">Paystack</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={v => push({ dateRange: v })}>
              <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-2.5 text-sm flex-1 min-w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="flex gap-1 mt-5 border-b border-[var(--ink-200)] overflow-x-auto">
          {TABS.map(t => {
            const count = t.dbKey === "all" ? counts.all : counts[t.dbKey] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => push({ status: t.id })}
                className={`px-3 md:px-3.5 py-2.5 border-0 bg-transparent cursor-pointer border-b-2 -mb-px text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-[var(--brand-500)] text-[var(--ink-900)]"
                    : "border-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)]"
                }`}
              >
                {t.label}
                <Badge className={`text-[11px] px-1.5 py-0 h-auto rounded-full border-transparent ${
                  active ? "bg-[var(--ink-200)] text-[var(--ink-900)]" : "bg-[var(--ink-200)] text-[var(--ink-700)]"
                }`}>
                  {count ?? 0}
                </Badge>
              </button>
            );
          })}
        </div>

        <Card className="mt-4 gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Reference", "Vendor", "Phone", "Network", "Bundle", "Amount", "Tier", "Payment", "Status", "Paid", ""].map(h => (
                    <TableHead key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)] border-b border-[var(--ink-200)] h-auto whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[var(--ink-100)]">
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-4">
                          <div className="h-4 bg-[var(--ink-100)] rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data?.orders ?? []).map(o => (
                  <TableRow key={o._id} className="cursor-pointer border-b border-[var(--ink-100)] hover:bg-[var(--ink-50)]/50">
                    <TableCell className="px-4 py-4 align-middle">
                      <Link href={`/admin/orders/${o._id}`} className="bh-mono font-semibold text-[var(--ink-900)] no-underline hover:text-[var(--brand-500)]">
                        {o.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-[13px] text-[var(--ink-600)] whitespace-nowrap">
                      {o.placedBy?.businessName ?? <span className="text-[var(--ink-400)] italic">Guest</span>}
                    </TableCell>
                    <TableCell className="bh-mono px-4 py-4 text-[13px] whitespace-nowrap">{o.customerPhone}</TableCell>
                    <TableCell className="px-4 py-4"><NetChip network={o.networkSnapshot} /></TableCell>
                    <TableCell className="px-4 py-4 text-sm whitespace-nowrap">{o.bundleNameSnapshot}</TableCell>
                    <TableCell className="bh-mono px-4 py-4 font-semibold text-sm whitespace-nowrap">{ghsp(o.amountGhs)}</TableCell>
                    <TableCell className="px-4 py-4">
                      {o.priceType === "vendor" ? (
                        <Badge className="rounded-full text-[11px] font-bold px-2 py-0.5 h-auto bg-[var(--brand-50)] text-[var(--brand-600)] border-transparent">
                          Vendor
                        </Badge>
                      ) : o.priceType === "public" ? (
                        <Badge className="rounded-full text-[11px] font-bold px-2 py-0.5 h-auto bg-[var(--ink-100)] text-[var(--ink-600)] border-transparent">
                          Public
                        </Badge>
                      ) : (
                        <span className="text-[var(--ink-400)] text-[13px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge className={`rounded-full text-[11px] font-bold px-2 py-0.5 h-auto ${PAYMENT_BADGE_CLASS[o.paymentMethod as keyof typeof PAYMENT_BADGE_CLASS] ?? ""}`}>
                        {o.paymentMethod.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={o.status.toUpperCase()} />
                        {o.jaybartError && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center size-[18px] rounded-full bg-[var(--err-bg)] text-[var(--err)] cursor-default shrink-0">
                                  <Icon name="info" size={11} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-snug">
                                {o.jaybartError}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-[var(--ink-500)] text-[13px] whitespace-nowrap">
                      {o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      {(o.status === "fulfilling" || o.status === "failed") && o.jaybartTransactionCode ? (
                        <Button
                          variant="outline"
                          onClick={() => syncOrder(o)}
                          disabled={isSyncing && syncingOrder?._id === o._id}
                          className="rounded-full px-3.5 py-2 h-auto text-[13px] font-semibold gap-1.5 whitespace-nowrap"
                          size="sm"
                        >
                          <Icon name="refresh" size={14} />
                          {isSyncing && syncingOrder?._id === o._id ? "Checking…" : "Sync"}
                        </Button>
                      ) : (o.status === "paid" || (o.status === "fulfilling" && !o.jaybartTransactionCode)) ? (
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            onClick={() => setCancelTarget(o)}
                            variant="outline"
                            className="rounded-full px-3.5 py-2 h-auto text-[13px] font-semibold gap-1.5 border-[var(--err)] text-[var(--err)] hover:bg-[var(--err-bg)] hover:text-[var(--err)] whitespace-nowrap"
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => setConfirmOrder(o)}
                            className="rounded-full px-3.5 py-2 h-auto text-[13px] font-semibold gap-1.5 bg-[var(--brand-500)] hover:bg-[var(--brand-600)] whitespace-nowrap"
                            size="sm"
                          >
                            <Icon name="check" size={14} /> Send bundle
                          </Button>
                        </div>
                      ) : (
                        <Button asChild variant="ghost" size="sm" className="rounded-full text-[var(--ink-700)]">
                          <Link href={`/admin/orders/${o._id}`}>View</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isLoading && (data?.orders ?? []).length === 0 && (
            <div className="py-16 text-center text-[var(--ink-500)]">
              <div className="font-semibold text-[var(--ink-700)]">All clear.</div>
              <div className="text-[13px] mt-1">No orders match your filters.</div>
            </div>
          )}
        </Card>

        {(data?.totalPages ?? 1) > 1 && (
          <div className="mt-4 flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" className="rounded-full" disabled={page <= 1} onClick={() => push({ page: String(page - 1) })}>
              Previous
            </Button>
            <span className="text-sm text-[var(--ink-500)]">{page} / {data?.totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-full" disabled={page >= (data?.totalPages ?? 1)} onClick={() => push({ page: String(page + 1) })}>
              Next
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOrder !== null}
        onOpenChange={open => !open && setConfirmOrder(null)}
        title="Send bundle via Jaybart?"
        description="Sends the bundle to Jaybart for delivery. The order will complete once Jaybart confirms delivery."
        confirmLabel="Send bundle"
        confirmDisabled={isSending}
        onConfirm={() => confirmOrder && sendBundle(confirmOrder)}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={open => !open && setCancelTarget(null)}
        title="Cancel order?"
        description="This marks the order as cancelled. You can issue a refund from the order detail page after cancelling."
        confirmLabel="Cancel order"
        variant="destructive"
        confirmDisabled={isCancelling}
        onConfirm={() => cancelTarget && doCancel(cancelTarget)}
      />
    </AdminShell>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <AdminOrdersContent />
    </Suspense>
  );
}
