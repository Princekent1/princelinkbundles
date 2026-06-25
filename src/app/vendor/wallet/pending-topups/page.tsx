"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { VendorShell } from "@/components/vendor/shell";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ghsp } from "@/lib/data";
import { getPendingTopups, verifyTopup, getVendorWallet } from "@/api";
import toast from "react-hot-toast";

function PendingTopupsContent() {
  const queryClient = useQueryClient();

  const { data: walletData } = useQuery({
    queryKey: getVendorWallet.key(1),
    queryFn: () => getVendorWallet.fn(1),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: getPendingTopups.key,
    queryFn: getPendingTopups.fn,
  });

  const { mutate: verify, isPending: verifying, variables: verifyingRef } = useMutation({
    mutationFn: (reference: string) => verifyTopup.fn(reference),
    onSuccess: (result, reference) => {
      if ("credited" in result && result.credited) {
        toast.success(`${ghsp(result.amountGhs)} credited to your wallet`);
        queryClient.invalidateQueries({ queryKey: ["vendor", "wallet"] });
        refetch();
      } else if ("alreadyProcessed" in result) {
        toast(result.status === "success" ? "This top-up was already credited" : "This top-up was not completed", {
          icon: result.status === "success" ? "✓" : "✗",
        });
        refetch();
      } else if ("credited" in result && !result.credited) {
        toast.error(`Payment not confirmed by Paystack (status: ${result.paystackStatus})`);
      }
    },
    onError: (err: { message: string }) => {
      toast.error(err.message ?? "Verification failed");
    },
  });

  const walletBalance = walletData?.walletBalance ?? 0;

  return (
    <VendorShell walletBalance={walletBalance}>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[760px] mx-auto">
        <div className="mb-6 md:mb-7">
          <Link
            href="/vendor/wallet"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-500)] hover:text-[var(--ink-800)] mb-4 transition-colors"
          >
            <Icon name="chevron-left" size={14} /> Back to wallet
          </Link>
          <h1 className="bh-display text-[24px] md:text-[28px] tracking-[-0.02em] mb-1">Pending top-ups</h1>
          <p className="text-[var(--ink-500)] text-sm m-0">
            Top-ups waiting for payment confirmation. Use &ldquo;Verify&rdquo; if you already paid but your wallet wasn&rsquo;t credited.
          </p>
        </div>

        <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 md:p-5 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[var(--ink-100)] animate-pulse" />
              ))}
            </div>
          ) : !data?.topups.length ? (
            <div className="px-5 py-12 text-center text-[var(--ink-500)] text-sm">
              No pending top-ups.
            </div>
          ) : (
            <div className="divide-y divide-[var(--ink-100)]">
              {data.topups.map(topup => (
                <div key={topup._id} className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bh-mono font-bold text-[15px] text-[var(--ink-900)]">{ghsp(topup.amountGhs)}</span>
                      <Badge className="bg-[var(--warn-bg)] text-[var(--warn)] border-transparent rounded-full text-[11px] font-bold px-2 py-0.5 h-auto">
                        PENDING
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bh-mono text-[11px] text-[var(--ink-500)]">{topup.reference}</span>
                      <span className="text-[11px] text-[var(--ink-400)]">
                        {new Date(topup.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {topup.processingFeeGhs > 0 && (
                      <div className="text-[11px] text-[var(--ink-500)]">
                        Paystack charged {ghsp(topup.totalPaidGhs)} including {ghsp(topup.processingFeeGhs)} fee
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={verifying && verifyingRef === topup.reference}
                    onClick={() => verify(topup.reference)}
                    className="rounded-full px-4 h-8 text-[13px] font-semibold shrink-0"
                  >
                    {verifying && verifyingRef === topup.reference ? "Checking…" : "Verify payment"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </VendorShell>
  );
}

export default function PendingTopupsPage() {
  return <PendingTopupsContent />;
}
