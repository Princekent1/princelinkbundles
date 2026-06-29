"use client";

import { useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VendorShell } from "@/components/vendor/shell";
import { NetMark } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ghsp } from "@/lib/data";
import { jaybartSyncToast } from "@/lib/order-status-copy";
import { getMe, getVendorOrders, syncVendorOrder, type VendorOrderItem } from "@/api";
import toast from "react-hot-toast";

const STATUS_TABS = [
  { label: "All",       value: "" },
  { label: "PENDING PAYMENT", value: "pending" },
  { label: "PAID",      value: "paid" },
  { label: "COMPLETED", value: "completed" },
  { label: "FAILED",    value: "failed" },
] as const;

const PAYMENT_TABS = [
  { label: "All payments", value: "" },
  { label: "WALLET",       value: "wallet" },
  { label: "PAYSTACK",     value: "paystack" },
] as const;

const NETWORK_TABS = [
  { label: "All networks", value: "" },
  { label: "MTN",          value: "mtn" },
  { label: "TELECEL",      value: "telecel" },
  { label: "AIRTELTIGO",   value: "airteltigo" },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VendorOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const page          = parseInt(searchParams.get("page") ?? "1", 10);
  const status        = searchParams.get("status") ?? "";
  const network       = searchParams.get("network") ?? "";
  const paymentMethod = searchParams.get("paymentMethod") ?? "";
  const search        = searchParams.get("search") ?? "";

  const { data: meData } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const { data, isLoading } = useQuery({
    queryKey: getVendorOrders.key({ page, status, network, paymentMethod, search }),
    queryFn: () => getVendorOrders.fn({ page, status, network, paymentMethod, search }),
  });

  const { mutate: syncOrder, isPending: isSyncing, variables: syncingOrder } = useMutation({
    mutationFn: (order: VendorOrderItem) => syncVendorOrder.fn(order._id),
    onSuccess: (result) => {
      toast.success(jaybartSyncToast(result.status));
      queryClient.invalidateQueries({ queryKey: ["vendor", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", "dashboard"] });
    },
    onError: () => toast.error("Failed to sync order status"),
  });

  const user = meData?.user;

  const setParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      params.delete("page");
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = () => {
    const value = searchRef.current?.value.trim() ?? "";
    setParam({ search: value });
  };

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  };

  const orders     = data?.orders ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <VendorShell
      walletBalance={user?.walletBalance ?? 0}
      vendorName={user?.businessName ?? user?.email ?? ""}
      vendorEmail={user?.email ?? ""}
    >
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[960px] mx-auto">
        <div className="mb-6 md:mb-7">
          <h1 className="bh-display text-[24px] md:text-[28px] tracking-[-0.02em] mb-1">Orders</h1>
          <p className="text-[var(--ink-500)] text-sm m-0">All bundles placed from your account.</p>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <Button
                  key={tab.value}
                  onClick={() => setParam({ status: tab.value })}
                  className={`rounded-full px-3 md:px-3.5 py-1.5 h-auto text-xs font-semibold gap-0 whitespace-nowrap ${
                    status === tab.value
                      ? "bg-[var(--ink-200)] text-[var(--ink-900)]"
                      : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full">
              {PAYMENT_TABS.map(tab => (
                <Button
                  key={tab.value}
                  onClick={() => setParam({ paymentMethod: tab.value })}
                  className={`rounded-full px-3 md:px-3.5 py-1.5 h-auto text-xs font-semibold gap-0 whitespace-nowrap ${
                    paymentMethod === tab.value
                      ? "bg-[var(--ink-200)] text-[var(--ink-900)]"
                      : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full">
              {NETWORK_TABS.map(tab => (
                <Button
                  key={tab.value}
                  onClick={() => setParam({ network: tab.value })}
                  className={`rounded-full px-3 md:px-3.5 py-1.5 h-auto text-xs font-semibold gap-0 whitespace-nowrap ${
                    network === tab.value
                      ? "bg-[var(--ink-200)] text-[var(--ink-900)]"
                      : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[var(--ink-100)] border border-[var(--ink-200)] rounded-full px-3.5 py-2">
            <Icon name="search" size={14} />
            <Input
              ref={searchRef}
              defaultValue={search}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search by reference or phone…"
              className="border-0 outline-none text-[13px] flex-1 bg-transparent h-auto p-0 rounded-none focus-visible:ring-0 focus-visible:border-0"
            />
            <Button
              onClick={handleSearch}
              className="rounded-full px-3 py-1 h-auto text-xs font-semibold bg-[var(--ink-200)] text-[var(--ink-900)] hover:bg-[var(--ink-700)]"
            >
              Search
            </Button>
          </div>
        </div>

        <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--ink-100)] hover:bg-transparent">
                  {["Reference", "Phone", "Network", "Bundle", "Amount", "Payment", "Status", "Date", ""].map(h => (
                    <TableHead key={h} className="px-4 py-3 text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide h-auto whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="px-4 py-10 text-center text-[var(--ink-500)] text-sm">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="px-4 py-10 text-center text-[var(--ink-500)] text-sm">
                      No orders match your filters.
                    </TableCell>
                  </TableRow>
                ) : orders.map(o => (
                  <TableRow key={o._id} className="border-b border-[var(--ink-50)] hover:bg-[var(--ink-50)]/50">
                    <TableCell className="px-4 py-3.5">
                      <span className="bh-mono text-[13px] font-semibold">{o.reference}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="bh-mono text-[13px] text-[var(--ink-600)] whitespace-nowrap">{o.customerPhone}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <NetMark network={o.networkSnapshot.toUpperCase()} size="sm" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-[13px] text-[var(--ink-700)] whitespace-nowrap">{o.bundleNameSnapshot}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="bh-mono text-[13px] font-semibold whitespace-nowrap">{ghsp(o.amountGhs)}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <Badge className={`rounded-full text-[11px] font-bold px-2 py-0.5 h-auto border-transparent ${
                        o.paymentMethod === "wallet"
                          ? "bg-[var(--brand-100)] text-[var(--brand-600)]"
                          : "bg-[var(--ink-100)] text-[var(--ink-600)]"
                      }`}>
                        {o.paymentMethod.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5"><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-[var(--ink-500)] whitespace-nowrap">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      {(o.status === "fulfilling" || o.status === "failed") && o.sentToProvider ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSyncing && syncingOrder?._id === o._id}
                          onClick={() => syncOrder(o)}
                          className="rounded-full px-3 py-1.5 h-auto text-xs font-semibold gap-1.5 whitespace-nowrap"
                        >
                          <Icon name="refresh" size={12} />
                          {isSyncing && syncingOrder?._id === o._id ? "Checking…" : "Sync"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--ink-500)]">
            {isLoading ? "—" : `${total} order${total !== 1 ? "s" : ""}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold bg-transparent text-[var(--ink-600)] border border-[var(--ink-200)] hover:bg-[var(--ink-50)] disabled:opacity-40"
              >
                <Icon name="arrow-left" size={12} />
              </Button>
              <span className="text-xs text-[var(--ink-500)]">Page {page} of {totalPages}</span>
              <Button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold bg-transparent text-[var(--ink-600)] border border-[var(--ink-200)] hover:bg-[var(--ink-50)] disabled:opacity-40"
              >
                <Icon name="arrow-right" size={12} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </VendorShell>
  );
}

export default function VendorOrdersPage() {
  return (
    <Suspense>
      <VendorOrdersContent />
    </Suspense>
  );
}
