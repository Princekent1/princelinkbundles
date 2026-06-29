"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ghsp } from "@/lib/data";
import { getAdminVendors, updateVendorStatus, type AdminVendorItem } from "@/api";
import toast from "react-hot-toast";

const STATUS_TABS = [
  { id: "all",       label: "All",       countKey: "all" },
  { id: "pending",   label: "PENDING",   countKey: "pending" },
  { id: "approved",  label: "APPROVED",  countKey: "approved" },
  { id: "suspended", label: "SUSPENDED", countKey: "suspended" },
] as const;

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved:  "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  pending:   "bg-[var(--warn-bg)] text-[var(--warn)] border-transparent",
  suspended: "bg-[var(--err-bg)] text-[var(--err)] border-transparent",
};

type ConfirmState = { vendor: AdminVendorItem; action: "approve" | "suspend" | "reactivate" } | null;

function AdminVendorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = searchParams.get("status") ?? "all";
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const searchRef = useRef(searchInput);
  searchRef.current = searchInput;

  function push(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "all") p.delete(k);
      else p.set(k, v);
    }
    router.replace(`?${p.toString()}`);
  }

  function submitSearch() {
    push({ search: searchRef.current || undefined });
  }

  const params = {
    status: activeTab !== "all" ? activeTab : undefined,
    search: searchParams.get("search") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: getAdminVendors.key(params),
    queryFn: () => getAdminVendors.fn(params),
  });

  const { mutate: changeStatus, isPending: isChanging } = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "suspend" | "reactivate" }) =>
      updateVendorStatus.fn(id, action),
    onSuccess: (_, vars) => {
      const label = vars.action === "approve" ? "Approved" : vars.action === "suspend" ? "Suspended" : "Reactivated";
      toast.success(`${label} successfully`);
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
    onError: () => toast.error("Action failed, please try again"),
  });

  const counts = data?.counts ?? {};
  const pendingCount = counts.pending ?? 0;

  return (
    <AdminShell>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[1100px] mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
          <div>
            <h1 className="bh-display text-[28px] tracking-[-0.02em] mb-1">Vendors</h1>
            <p className="text-[var(--ink-500)] text-sm m-0">
              {pendingCount > 0 ? `${pendingCount} pending approval` : "All vendors up to date"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full overflow-x-auto">
            {STATUS_TABS.map(tab => {
              const count = counts[tab.countKey] ?? 0;
              const active = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  onClick={() => push({ status: tab.id })}
                  className={`rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold gap-0 whitespace-nowrap ${
                    active
                      ? "bg-[var(--ink-900)] text-white"
                      : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
                  }`}
                >
                  {tab.label} <span className="opacity-60 ml-0.5">({count})</span>
                </Button>
              );
            })}
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[var(--ink-100)] border border-[var(--ink-200)] rounded-full px-3.5 py-2">
            <Icon name="search" size={14} />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitSearch()}
              placeholder="Search by name, email or phone…"
              className="border-0 outline-none text-[13px] flex-1 bg-transparent h-auto p-0 rounded-none focus-visible:ring-0 focus-visible:border-0"
            />
            <Button
              onClick={submitSearch}
              className="rounded-full px-3 py-1 h-auto text-xs font-semibold bg-[var(--ink-900)] text-white hover:bg-[var(--ink-700)]"
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
                  {["Business", "Email", "Phone", "Wallet", "Status", "Joined", "Actions"].map(h => (
                    <TableHead key={h} className="px-4 py-3 text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide h-auto whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[var(--ink-50)]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-[var(--ink-100)] rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data?.vendors ?? []).length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="px-4 py-10 text-center text-[var(--ink-500)] text-sm">
                      No vendors match your filters.
                    </TableCell>
                  </TableRow>
                ) : (data?.vendors ?? []).map(v => (
                  <TableRow key={v._id} className="border-b border-[var(--ink-50)] hover:bg-[var(--ink-50)]/50">
                    <TableCell className="px-4 py-3.5">
                      <Link href={`/admin/vendors/${v._id}`} className="font-semibold text-sm text-[var(--ink-900)] no-underline hover:text-[var(--brand-500)] whitespace-nowrap">
                        {v.businessName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-[13px] text-[var(--ink-600)]">{v.email}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="bh-mono text-[13px] text-[var(--ink-600)] whitespace-nowrap">{v.phone}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="bh-mono text-[13px] font-semibold whitespace-nowrap">{ghsp(v.walletBalance)}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <Badge className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 h-auto ${STATUS_BADGE_CLASS[v.status] ?? ""}`}>
                        {v.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-[var(--ink-500)] whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        {v.status === "pending" && (
                          <Button size="sm" onClick={() => setConfirm({ vendor: v, action: "approve" })}
                            className="rounded-lg px-3 py-1.5 h-auto text-xs font-semibold bg-[var(--ok-bg)] text-[var(--ok)] hover:bg-[var(--ok-bg)]/80 border-transparent whitespace-nowrap">
                            Approve
                          </Button>
                        )}
                        {v.status === "approved" && (
                          <Button size="sm" onClick={() => setConfirm({ vendor: v, action: "suspend" })}
                            className="rounded-lg px-3 py-1.5 h-auto text-xs font-semibold bg-[var(--err-bg)] text-[var(--err)] hover:bg-[var(--err-bg)]/80 border-transparent whitespace-nowrap">
                            Suspend
                          </Button>
                        )}
                        {v.status === "suspended" && (
                          <Button size="sm" onClick={() => setConfirm({ vendor: v, action: "reactivate" })}
                            className="rounded-lg px-3 py-1.5 h-auto text-xs font-semibold bg-[var(--warn-bg)] text-[var(--warn)] hover:bg-[var(--warn-bg)]/80 border-transparent whitespace-nowrap">
                            Reactivate
                          </Button>
                        )}
                        <Button asChild size="sm" className="rounded-lg px-3 py-1.5 h-auto text-xs font-semibold bg-[var(--ink-100)] text-[var(--ink-700)] hover:bg-[var(--ink-200)] border-transparent">
                          <Link href={`/admin/vendors/${v._id}`}>Detail</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {!isLoading && (
          <div className="mt-3 text-xs text-[var(--ink-500)]">
            {data?.total ?? 0} vendor{(data?.total ?? 0) !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {confirm && (() => {
        const cfg = {
          approve:    { title: `Approve ${confirm.vendor.businessName}?`,    description: "They'll get immediate access to the vendor console.", confirmLabel: "Approve",    variant: "default"      },
          suspend:    { title: `Suspend ${confirm.vendor.businessName}?`,    description: "They lose access to their console immediately.",       confirmLabel: "Suspend",    variant: "destructive"  },
          reactivate: { title: `Reactivate ${confirm.vendor.businessName}?`, description: "Restores their full vendor console access.",            confirmLabel: "Reactivate", variant: "default"      },
        }[confirm.action] as { title: string; description: string; confirmLabel: string; variant: "default" | "destructive" };
        return (
          <ConfirmDialog
            open
            onOpenChange={open => !open && setConfirm(null)}
            {...cfg}
            confirmDisabled={isChanging}
            onConfirm={() => changeStatus({ id: confirm.vendor._id, action: confirm.action })}
          />
        );
      })()}
    </AdminShell>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense>
      <AdminVendorsContent />
    </Suspense>
  );
}
