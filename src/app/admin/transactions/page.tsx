"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ghsp } from "@/lib/data";
import { getAdminTransactions, type AdminTransaction } from "@/api";

const TYPE_BADGE: Record<string, string> = {
  topup:      "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  purchase:   "bg-[var(--ink-100)] text-[var(--ink-600)] border-transparent",
  refund:     "bg-[var(--info-bg)] text-[var(--info)] border-transparent",
  adjustment: "bg-[var(--warn-bg)] text-[var(--warn)] border-transparent",
};

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type    = searchParams.get("type") ?? "all";
  const page    = parseInt(searchParams.get("page") ?? "1", 10);

  const params = {
    page,
    type: type !== "all" ? type : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: getAdminTransactions.key(params),
    queryFn: () => getAdminTransactions.fn(params),
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

  const transactions: AdminTransaction[] = data?.transactions ?? [];
  const summary = data?.summary;

  const SUMMARY_CARDS = [
    { key: "topup" as const,      label: "Top-ups",    accent: "var(--ok)",   sign: "+" },
    { key: "purchase" as const,   label: "Purchases",  accent: "var(--ink-600)", sign: "−" },
    { key: "refund" as const,     label: "Refunds",    accent: "var(--info)", sign: "+" },
    { key: "adjustment" as const, label: "Adjustments", accent: "var(--warn)", sign: "±" },
  ];

  return (
    <AdminShell>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
          <div>
            <h1 className="bh-display text-[28px] md:text-[32px] m-0 tracking-[-0.03em]">Transactions</h1>
            <p className="text-[var(--ink-500)] mt-1 mb-0">All wallet activity across vendors.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          {SUMMARY_CARDS.map(c => (
            <button
              key={c.key}
              onClick={() => push({ type: type === c.key ? undefined : c.key })}
              className={`text-left p-4 md:p-5 rounded-2xl border relative overflow-hidden transition-colors cursor-pointer ${
                type === c.key
                  ? "border-[var(--ink-900)] bg-[var(--ink-50)]"
                  : "border-[var(--ink-200)] bg-white hover:border-[var(--ink-400)]"
              }`}
            >
              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: c.accent }} />
              <div className="text-[11px] text-[var(--ink-500)] font-semibold uppercase tracking-wide">{c.label}</div>
              <div className="bh-display text-[22px] md:text-[26px] tracking-[-0.02em] mt-1" style={{ color: c.accent }}>
                {isLoading ? "—" : summary ? ghsp(Math.abs(summary[c.key].total)) : "—"}
              </div>
              <div className="text-[12px] text-[var(--ink-400)] mt-0.5">
                {isLoading ? "" : summary ? `${summary[c.key].count} txns` : ""}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-3">
          {type !== "all" && (
            <Button variant="ghost" size="sm" className="rounded-full text-[var(--ink-500)] h-auto py-1.5 text-[13px]" onClick={() => push({ type: undefined })}>
              Clear filter
            </Button>
          )}
          <Select value={type} onValueChange={v => push({ type: v })}>
            <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-2.5 text-sm w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="topup">Top-up</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Date", "Vendor", "Type", "Amount", "Balance after", "Order", "Note"].map(h => (
                    <TableHead key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)] border-b border-[var(--ink-200)] h-auto whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[var(--ink-100)]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-4">
                          <div className="h-4 bg-[var(--ink-100)] rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.map(t => (
                  <TableRow key={t._id} className="border-b border-[var(--ink-100)] hover:bg-[var(--ink-50)]/50">
                    <TableCell className="px-4 py-4 text-[13px] text-[var(--ink-500)] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {t.vendor ? (
                        <Link href={`/admin/vendors/${t.vendor._id}`} className="text-[13px] font-semibold text-[var(--ink-900)] no-underline hover:text-[var(--brand-500)]">
                          {t.vendor.businessName}
                        </Link>
                      ) : (
                        <span className="text-[var(--ink-400)] italic text-[13px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge className={`rounded-full text-[11px] font-bold px-2 py-0.5 h-auto capitalize ${TYPE_BADGE[t.type] ?? ""}`}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="bh-mono px-4 py-4 font-semibold text-sm whitespace-nowrap"
                      style={{ color: t.amountGhs > 0 ? "var(--ok)" : "var(--ink-900)" }}
                    >
                      {t.amountGhs > 0 ? "+" : ""}{ghsp(t.amountGhs)}
                    </TableCell>
                    <TableCell className="bh-mono px-4 py-4 text-[13px] text-[var(--ink-600)] whitespace-nowrap">
                      {ghsp(t.balanceAfter)}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {t.relatedOrderReference && t.relatedOrderId ? (
                        <Link href={`/admin/orders/${t.relatedOrderId}`} className="bh-mono text-[13px] font-semibold text-[var(--ink-900)] no-underline hover:text-[var(--brand-500)]">
                          {t.relatedOrderReference}
                        </Link>
                      ) : (
                        <span className="text-[var(--ink-400)] text-[13px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-[13px] text-[var(--ink-600)] max-w-[220px] truncate">
                      {t.note ?? <span className="text-[var(--ink-400)]">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isLoading && transactions.length === 0 && (
            <div className="py-16 text-center text-[var(--ink-500)]">
              <div className="font-semibold text-[var(--ink-700)]">No transactions found.</div>
              <div className="text-[13px] mt-1">Try adjusting your filters.</div>
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
    </AdminShell>
  );
}

export default function AdminTransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
