"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { VendorShell } from "@/components/vendor/shell";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ghsp } from "@/lib/data";
import { getPaymentSettings, getVendorWallet, initWalletTopup } from "@/api";
import { calculatePaystackFee } from "@/lib/paystack-fees";
import toast from "react-hot-toast";

const TYPE_LABELS: Record<string, string> = {
  topup:      "Wallet top-up",
  purchase:   "Bundle purchase",
  refund:     "Refund",
  adjustment: "Manual adjustment",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  topup:      "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  purchase:   "bg-[var(--ink-100)] text-[var(--ink-600)] border-transparent",
  refund:     "bg-[var(--info-bg)] text-[var(--info)] border-transparent",
  adjustment: "bg-[var(--warn-bg)] text-[var(--warn)] border-transparent",
};

function WalletPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [page, setPage] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: getVendorWallet.key(page),
    queryFn: () => getVendorWallet.fn(page),
  });

  const { data: paymentSettings } = useQuery({
    queryKey: getPaymentSettings.key,
    queryFn: getPaymentSettings.fn,
  });

  useEffect(() => {
    const topup = searchParams.get("topup");
    if (topup === "success") {
      toast.success("Wallet topped up successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor", "wallet"] });
      router.replace("/vendor/wallet");
    } else if (topup === "cancelled") {
      toast.error("Top-up cancelled");
      router.replace("/vendor/wallet");
    }
  }, [searchParams, queryClient, router]);

  const { mutate: startTopup, isPending } = useMutation({
    mutationFn: () => {
      const pesewas = Math.round(parseFloat(amount) * 100);
      return initWalletTopup.fn(pesewas);
    },
    onSuccess: (result) => {
      setIsRedirecting(true);
      window.location.href = result.paystackUrl;
    },
    onError: (err: { message: string }) => {
      toast.error(err.message ?? "Failed to initialize top-up");
    },
  });

  const amountNum     = parseFloat(amount);
  const validAmount   = !isNaN(amountNum) && amountNum >= 1 && amountNum <= 5000;
  const walletBalance = data?.walletBalance ?? 0;
  const topupBaseGhs = validAmount ? Math.round(amountNum * 100) : 0;
  const fee = validAmount
    ? calculatePaystackFee(
        topupBaseGhs,
        paymentSettings?.passPaystackFeesToCustomers ?? false,
        paymentSettings?.paystackFeeRateBps
      )
    : null;

  return (
    <VendorShell walletBalance={walletBalance}>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[760px] mx-auto">
        <div className="mb-6 md:mb-7">
          <h1 className="bh-display text-[24px] md:text-[28px] tracking-[-0.02em] mb-1">Wallet</h1>
          <p className="text-[var(--ink-500)] text-sm m-0">Your pre-loaded balance for placing orders instantly.</p>
        </div>

        <div
          className="p-5 md:p-7 rounded-[20px] text-white mb-6 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, var(--brand-500) 0%, var(--ink-200) 100%)" }}
        >
          <div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-wide mb-1.5">Current balance</div>
            {isLoading ? (
              <div className="h-11 w-36 rounded-xl bg-white/20 animate-pulse" />
            ) : (
              <div className="bh-display text-[36px] md:text-[44px] tracking-[-0.02em]">{ghsp(walletBalance)}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button
              onClick={() => setShowTopUp(v => !v)}
              className="rounded-full px-[22px] py-3.5 h-auto text-sm font-semibold gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white"
            >
              <Icon name={showTopUp ? "x" : "plus"} size={16} /> {showTopUp ? "Cancel" : "Top up"}
            </Button>
            <Link
              href="/vendor/wallet/pending-topups"
              className="text-[11px] text-white/60 hover:text-white/90 underline underline-offset-2 transition-colors"
            >
              Paid but not credited?
            </Link>
          </div>
        </div>

        {showTopUp && (
          <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)] mb-6">
            <div className="font-bold text-[15px] mb-3.5">Add funds</div>
            <div className="flex gap-2 mb-3.5 flex-wrap">
              {[50, 100, 200, 500].map(preset => (
                <Button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-full px-[18px] py-2 h-auto text-[13px] font-semibold gap-0 ${
                    amount === String(preset)
                      ? "bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white border-transparent"
                      : "bg-[var(--ink-100)] border-[var(--ink-200)] text-[var(--ink-700)] hover:border-[var(--ink-300)]"
                  }`}
                >
                  GHS {preset}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5 items-end">
              <div className="flex-1 min-w-[160px] flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Custom amount (GHS)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                />
              </div>
              <Button
                onClick={() => startTopup()}
                disabled={isPending || isRedirecting || !validAmount}
                className="rounded-xl px-[22px] py-3 h-auto text-sm font-semibold whitespace-nowrap"
              >
                {isPending || isRedirecting ? "Redirecting…" : `Pay ${fee ? ghsp(fee.totalPayableGhs) : "with Paystack"}`}
              </Button>
            </div>
            {fee && fee.processingFeeGhs > 0 && (
              <div className="mt-3 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-3.5 py-3 text-xs text-[var(--ink-600)]">
                Wallet credit <strong>{ghsp(fee.baseAmountGhs)}</strong> + Paystack fee <strong>{ghsp(fee.processingFeeGhs)}</strong> = <strong>{ghsp(fee.totalPayableGhs)}</strong>
              </div>
            )}
            <p className="mt-2.5 text-xs text-[var(--ink-500)]">
              You&apos;ll be redirected to Paystack to complete the Mobile Money payment. Maximum GHS 5,000 per top-up.
            </p>
          </Card>
        )}

        <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-[var(--ink-100)] flex items-center justify-between gap-3">
            <span className="font-bold text-[15px]">Transaction history</span>
            <Link href="/vendor/wallet/pending-topups" className="text-[12px] text-[var(--brand-500)] hover:underline shrink-0">
              Paid but not credited?
            </Link>
          </div>
          {isLoading ? (
            <div className="p-4 md:p-5 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-[var(--ink-100)] animate-pulse" />
              ))}
            </div>
          ) : !data?.transactions.length ? (
            <div className="px-5 py-10 text-center text-[var(--ink-500)] text-sm">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--ink-100)] hover:bg-transparent">
                    {["Type", "Description", "Amount", "Balance after", "Date"].map(h => (
                      <TableHead key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide h-auto whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map(tx => (
                    <TableRow key={tx._id} className="border-b border-[var(--ink-50)] hover:bg-[var(--ink-50)]/50">
                      <TableCell className="px-4 py-3.5">
                        <Badge className={`${TYPE_BADGE_CLASS[tx.type] ?? TYPE_BADGE_CLASS.adjustment} rounded-full text-[11px] font-bold px-2 py-0.5 h-auto`}>
                          {tx.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-[13px] text-[var(--ink-700)]">
                        <div>{TYPE_LABELS[tx.type] ?? tx.type}</div>
                        {tx.relatedOrderId && (
                          <div className="bh-mono text-[11px] text-[var(--ink-500)] mt-0.5">
                            Order: {tx.relatedOrderReference ?? tx.relatedOrderId}
                          </div>
                        )}
                        {tx.relatedTopupId && (
                          <div className="bh-mono text-[11px] text-[var(--ink-500)] mt-0.5">
                            Top-up: {tx.relatedTopupReference ?? tx.relatedTopupId}
                          </div>
                        )}
                        {tx.note && (
                          <div className="text-[11px] text-[var(--ink-500)] mt-0.5">{tx.note}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span
                          className="bh-mono text-[13px] font-bold whitespace-nowrap"
                          style={{ color: tx.amountGhs > 0 ? "var(--ok)" : "var(--ink-900)" }}
                        >
                          {tx.amountGhs > 0 ? "+" : ""}{ghsp(tx.amountGhs)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span className="bh-mono text-[13px] text-[var(--ink-600)] whitespace-nowrap">{ghsp(tx.balanceAfter)}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-xs text-[var(--ink-500)] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="px-4 md:px-5 py-3.5 border-t border-[var(--ink-100)] flex items-center justify-between">
              <span className="text-xs text-[var(--ink-500)]">Page {page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" className="rounded-full" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </VendorShell>
  );
}

import { Suspense } from "react";

export default function VendorWalletPage() {
  return (
    <Suspense>
      <WalletPageContent />
    </Suspense>
  );
}
