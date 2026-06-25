"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { NetChip } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ghsp } from "@/lib/data";
import { getAdminOrderDetail, completeOrder, failOrder, refundOrder, verifyOrderPayment, syncAdminOrder, cancelOrder, markOrderRefunded } from "@/api";
import toast from "react-hot-toast";

type ConfirmAction = "complete" | "fail" | "refund" | "cancel" | "markRefunded" | null;

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [failReason, setFailReason] = useState("");
  const hasSynced = useRef(false);

  const { data: order, isLoading } = useQuery({
    queryKey: getAdminOrderDetail.key(id),
    queryFn: () => getAdminOrderDetail.fn(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getAdminOrderDetail.key(id) });
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  const { mutate: doSync, isPending: isSyncing } = useMutation({
    mutationFn: () => syncAdminOrder.fn(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Failed to sync Jaybart status"),
  });

  useEffect(() => {
    if (!hasSynced.current && (order?.status === "fulfilling" || order?.status === "failed") && order?.jaybartTransactionCode) {
      hasSynced.current = true;
      doSync();
    }
  }, [order?.status, order?.jaybartTransactionCode, doSync]);

  const { mutate: doComplete, isPending: isCompleting } = useMutation({
    mutationFn: () => completeOrder.fn(id),
    onSuccess: () => { toast.success("Bundle sent to Jaybart"); setConfirmAction(null); invalidate(); },
    onError: (err: { message?: string }) => toast.error(err.message ?? "Could not send bundle to Jaybart"),
  });

  const { mutate: doFail, isPending: isFailing } = useMutation({
    mutationFn: () => failOrder.fn(id, failReason),
    onSuccess: () => { toast.success("Order marked as failed"); setConfirmAction(null); setFailReason(""); invalidate(); },
    onError: () => toast.error("Could not mark order as failed"),
  });

  const { mutate: doRefund, isPending: isRefunding } = useMutation({
    mutationFn: () => refundOrder.fn(id),
    onSuccess: () => { toast.success("Wallet refund issued"); setConfirmAction(null); invalidate(); },
    onError: () => toast.error("Could not issue refund"),
  });

  const { mutate: doCancel, isPending: isCancelling } = useMutation({
    mutationFn: () => cancelOrder.fn(id),
    onSuccess: () => { toast.success("Order cancelled"); setConfirmAction(null); invalidate(); },
    onError: () => toast.error("Could not cancel order"),
  });

  const { mutate: doMarkRefunded, isPending: isMarkingRefunded } = useMutation({
    mutationFn: () => markOrderRefunded.fn(id),
    onSuccess: () => { toast.success("Marked as refunded"); setConfirmAction(null); invalidate(); },
    onError: () => toast.error("Could not mark as refunded"),
  });

  const { mutate: doVerify, isPending: isVerifying } = useMutation({
    mutationFn: () => verifyOrderPayment.fn(id),
    onSuccess: (result) => {
      if (result.verified) {
        toast.success("Payment confirmed — order marked as paid");
        invalidate();
      } else if (result.paystackStatus === "success") {
        toast.success("Payment already confirmed on Paystack");
      } else {
        toast.error(`Payment not confirmed — Paystack status: ${result.paystackStatus ?? "unknown"}`);
      }
    },
    onError: () => toast.error("Paystack verification failed"),
  });

  function copyPhone() {
    if (order?.customerPhone) {
      navigator.clipboard.writeText(order.customerPhone);
      toast.success("Phone copied");
    }
  }

  if (isLoading || !order) {
    return (
      <AdminShell>
        <div className="p-4 md:p-8 max-w-[920px]">
          <div className="h-8 w-48 bg-[var(--ink-100)] rounded animate-pulse mb-6" />
          <div className="h-32 bg-[var(--ink-100)] rounded-2xl animate-pulse" />
        </div>
      </AdminShell>
    );
  }

  const isAwaitingJaybart = (order.status === "fulfilling" || order.status === "failed") && !!order.jaybartTransactionCode;
  const canComplete = (order.status === "paid" || order.status === "fulfilling") && !isAwaitingJaybart;
  const canFail = order.status === "paid" || order.status === "fulfilling";
  const canCancel = (order.status === "paid" || (order.status === "fulfilling" && !order.jaybartTransactionCode));
  const canRefund = order.status === "failed" && order.paymentMethod === "wallet" && order.placedBy !== null && !order.refundedAt;
  const canMarkRefunded = order.status === "cancelled";

  const activityItems = [
    order.refundedAt && { t: order.refundedAt, l: "Wallet refund issued", k: "info" },
    order.failedAt && { t: order.failedAt, l: `Marked as failed — ${order.failureReason}`, k: "err" },
    order.completedAt && {
      t: order.completedAt,
      l: `Marked as completed by ${order.completedBy ?? "admin"}${order.jaybartTransactionCode ? ` · Jaybart TX: ${order.jaybartTransactionCode}` : ""}`,
      k: "ok",
    },
    order.paidAt && { t: order.paidAt, l: "Payment confirmed", k: "ok" },
    order.createdAt && { t: order.createdAt, l: `Order created · reference ${order.reference}`, k: "info" },
  ].filter(Boolean) as { t: string; l: string; k: string }[];

  return (
    <AdminShell>
      <div className="p-4 md:p-8 max-w-[920px]">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[var(--ink-700)] no-underline"
        >
          <Icon name="arrow-left" size={14} /> Back to orders
        </Link>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <h1 className="bh-display text-[28px] md:text-[36px] m-0 tracking-[0.04em]">{order.reference}</h1>
          <StatusBadge status={order.status.toUpperCase()} />
          {order.paidAt && (
            <span className="text-[13px] text-[var(--ink-500)]">
              Paid {new Date(order.paidAt).toLocaleString()}
            </span>
          )}
        </div>

        {(canComplete || canFail || canCancel) && (
          <div
            className="mt-5 p-4 md:p-6 rounded-2xl border border-[var(--brand-100)]"
            style={{ background: "linear-gradient(180deg, var(--brand-50) 0%, white 100%)" }}
          >
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide">Send to</div>
                <div className="bh-display text-[24px] md:text-[28px] mt-1">{order.customerPhone}</div>
                <div className="text-sm text-[var(--ink-700)] mt-1 flex items-center gap-2">
                  <NetChip network={order.networkSnapshot} /> <strong>{order.bundleNameSnapshot}</strong>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={copyPhone}>
                  <Icon name="copy" size={14} /> Copy phone
                </Button>
                {canCancel && (
                  <Button
                    onClick={() => setConfirmAction("cancel")}
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5 border-[var(--err)] text-[var(--err)] hover:bg-[var(--err-bg)] hover:text-[var(--err)]"
                  >
                    Cancel order
                  </Button>
                )}
                {canFail && (
                  <Button
                    onClick={() => setConfirmAction("fail")}
                    size="sm"
                    className="rounded-full gap-1.5 bg-[var(--err-bg)] text-[var(--err)] hover:bg-[var(--err-bg)]/80 border-transparent"
                  >
                    Mark as failed
                  </Button>
                )}
                {canComplete && (
                  <Button
                    onClick={() => setConfirmAction("complete")}
                    className="rounded-full px-5 py-2.5 h-auto text-sm font-semibold gap-1.5 shadow-[0_6px_20px_-8px_var(--brand-500)]"
                  >
                    <Icon name="check" size={16} /> Mark as completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isAwaitingJaybart && (
          <div className="mt-5 p-4 md:p-5 rounded-2xl border border-[var(--ink-200)] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-[var(--ink-100)] flex items-center justify-center shrink-0">
                <span className={isSyncing ? "animate-spin" : ""} style={{ display: "inline-flex" }}>
                  <Icon name="loader" size={16} />
                </span>
              </div>
              <div>
                <div className="font-semibold text-sm text-[var(--ink-900)]">
                  {isSyncing ? "Checking Jaybart…" : order.status === "failed" ? "Jaybart delivery failed" : "Awaiting Jaybart delivery"}
                </div>
                <div className="text-xs text-[var(--ink-500)] mt-0.5">
                  {order.status === "failed" && !isSyncing && <span className="mr-1.5">Sync to check if Jaybart has retried delivery.</span>}
                  TX: <span className="bh-mono">{order.jaybartTransactionCode}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
              disabled={isSyncing}
              onClick={() => doSync()}
            >
              <Icon name="refresh" size={13} />
              {isSyncing ? "Checking…" : "Check status"}
            </Button>
          </div>
        )}

        {canComplete && order.jaybartError && (
          <div className="mt-3 p-4 rounded-[14px] border border-[var(--err)] bg-[var(--err-bg)]">
            <div className="font-bold text-sm text-[var(--err)] mb-0.5">Last Jaybart attempt failed</div>
            <p className="text-[13px] text-[var(--ink-600)] m-0">{order.jaybartError}</p>
          </div>
        )}

        {canComplete && order.jaybartPackageId === null && (
          <div className="mt-3 p-4 rounded-[14px] border border-[var(--warn)] bg-[var(--warn-bg)]">
            <div className="font-bold text-sm text-[oklch(0.50_0.15_80)] mb-0.5">Bundle not mapped to Jaybart</div>
            <p className="text-[13px] text-[var(--ink-600)] m-0">
              This order cannot be fulfilled automatically. Map <strong>{order.bundleNameSnapshot}</strong> to a Jaybart package in the{" "}
              <Link href="/admin/bundles" className="underline font-semibold text-[var(--ink-800)]">Bundle Catalog</Link>{" "}
              before completing this order.
            </p>
          </div>
        )}

        {canRefund && (
          <div className="mt-3 p-4 md:p-5 rounded-[14px] border border-[var(--info)]" style={{ background: "var(--info-bg)" }}>
            <div className="font-bold text-sm text-[var(--info)] mb-1.5">Refund to wallet</div>
            <p className="text-[13px] text-[var(--ink-600)] m-0 mb-3 leading-relaxed">
              Credit <strong>{ghsp(order.amountGhs)}</strong> back to <strong>{order.placedBy?.businessName}</strong>&apos;s wallet.
            </p>
            <Button
              onClick={() => setConfirmAction("refund")}
              className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold gap-1.5 bg-[var(--info)] hover:bg-[var(--info)]/90 text-white"
            >
              <Icon name="wallet" size={14} /> Issue wallet refund
            </Button>
          </div>
        )}

        {order.refundedAt && (
          <div className="mt-3 p-4 rounded-[14px] border border-[var(--ok-bg)] bg-[var(--ok-bg)]">
            <span className="text-sm text-[var(--ok)] font-semibold">Wallet refund issued</span>
            <span className="text-xs text-[var(--ink-500)] ml-2">{new Date(order.refundedAt).toLocaleString()}</span>
          </div>
        )}

        {canMarkRefunded && (
          <div className="mt-3 p-4 md:p-5 rounded-[14px] border border-[var(--info)]" style={{ background: "var(--info-bg)" }}>
            <div className="font-bold text-sm text-[var(--info)] mb-1.5">Mark as refunded</div>
            <p className="text-[13px] text-[var(--ink-600)] m-0 mb-3 leading-relaxed">
              {order.paymentMethod === "wallet" && order.placedBy
                ? `Credits ${ghsp(order.amountGhs)} back to ${order.placedBy.businessName}'s wallet and logs a refund transaction in their ledger.`
                : `Changes this order's status to Refunded. No automatic action is taken — use this to record that a Paystack refund was issued externally.`}
            </p>
            <Button
              onClick={() => setConfirmAction("markRefunded")}
              className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold gap-1.5 bg-[var(--info)] hover:bg-[var(--info)]/90 text-white"
            >
              <Icon name="wallet" size={14} /> Mark as refunded
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-4">
          <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="font-bold text-base mb-3.5">Order details</div>
            {([
              ["Bundle", <span key="b"><strong>{order.bundleNameSnapshot}</strong> <span className="text-[var(--ink-500)]">· {ghsp(order.amountGhs)}</span></span>],
              ["Network", <NetChip key="n" network={order.networkSnapshot} />],
              ["Payment method", (
                <Badge key="pm" className={`rounded-full text-[11px] font-bold px-2 py-0.5 h-auto border-transparent ${
                  order.paymentMethod === "wallet"
                    ? "bg-[var(--brand-100)] text-[var(--brand-600)]"
                    : "bg-[var(--ink-100)] text-[var(--ink-600)]"
                }`}>{order.paymentMethod.toUpperCase()}</Badge>
              )],
              order.placedBy ? ["Vendor", <span key="v" className="font-semibold">{order.placedBy.businessName}</span>] : null,
              ["Customer phone", <span key="p" className="bh-mono">{order.customerPhone}</span>],
              order.customerEmail ? ["Customer email", <span key="e">{order.customerEmail}</span>] : null,
              ["Bundle amount", <span key="a" className="bh-mono font-bold">{ghsp(order.amountGhs)}</span>],
              order.processingFeeGhs > 0 ? ["Paystack fee", <span key="fee" className="bh-mono font-bold">{ghsp(order.processingFeeGhs)}</span>] : null,
              ["Amount paid", <span key="total" className="bh-mono font-bold">{ghsp(order.totalPaidGhs)}</span>],
              order.paystackAmountGhs !== null ? ["Paystack verified amount", <span key="pa" className="bh-mono font-bold">{ghsp(order.paystackAmountGhs)}</span>] : null,
              order.paystackReference ? ["Paystack ref", <span key="pr" className="bh-mono text-xs">{order.paystackReference}</span>] : null,
              ["Created", new Date(order.createdAt).toLocaleString()],
              order.paidAt ? ["Paid", new Date(order.paidAt).toLocaleString()] : null,
              order.failureReason ? ["Failure reason", <span key="fr" className="text-[var(--err)]">{order.failureReason}</span>] : null,
            ] as ([string, React.ReactNode] | null)[])
              .filter((r): r is [string, React.ReactNode] => r !== null)
              .map(([k, v], i, a) => (
                <div key={i} className={`flex justify-between py-3 text-sm gap-3 ${i < a.length - 1 ? "border-b border-[var(--ink-100)]" : ""}`}>
                  <span className="text-[var(--ink-500)] shrink-0">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
              <div className="font-bold text-base mb-3.5">Activity</div>
              {activityItems.map((e, i) => (
                <div key={i} className="flex gap-2.5 py-2">
                  <span
                    className="size-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: e.k === "ok" ? "var(--ok)" : e.k === "err" ? "var(--err)" : "var(--info)" }}
                  />
                  <div>
                    <div className="text-[13px]">{e.l}</div>
                    <div className="text-[11px] text-[var(--ink-500)]">{new Date(e.t).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
              <div className="font-bold text-sm">Something off?</div>
              <p className="text-[13px] text-[var(--ink-500)] my-1.5 mb-3 leading-relaxed">
                Re-verify with Paystack if the webhook didn&apos;t fire.
              </p>
              <Button
                variant="outline"
                className="w-full rounded-full"
                disabled={isVerifying || order.paymentMethod !== "paystack" || order.status !== "pending_payment"}
                onClick={() => doVerify()}
              >
                {isVerifying ? "Verifying…" : "Verify with Paystack"}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === "complete"}
        onOpenChange={open => !open && setConfirmAction(null)}
        title="Send bundle via Jaybart?"
        description="Sends the bundle to Jaybart for delivery. The order will complete once Jaybart confirms delivery."
        confirmLabel="Send bundle"
        confirmDisabled={isCompleting}
        onConfirm={() => doComplete()}
      />

      <ConfirmDialog
        open={confirmAction === "fail"}
        onOpenChange={open => { if (!open) { setConfirmAction(null); setFailReason(""); } }}
        title="Mark order as failed?"
        description="Provide a reason — this is recorded in the activity log."
        confirmLabel="Mark failed"
        variant="destructive"
        confirmDisabled={!failReason.trim() || isFailing}
        onConfirm={() => doFail()}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
            Failure reason <span className="text-[var(--err)]">*</span>
          </Label>
          <Input
            placeholder="e.g. SIM not active on network"
            value={failReason}
            onChange={e => setFailReason(e.target.value)}
            className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
          />
          {order?.paymentMethod === "wallet" && (
            <p className="text-xs text-[var(--ink-500)] mt-0.5">
              Wallet order — you can issue a refund from this page after marking failed.
            </p>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAction === "refund"}
        onOpenChange={open => !open && setConfirmAction(null)}
        title="Issue wallet refund?"
        description={`Credit ${order ? ghsp(order.amountGhs) : ""} back to ${order?.placedBy?.businessName ?? ""}'s wallet. This creates a REFUND transaction in their ledger.`}
        confirmLabel="Issue refund"
        confirmDisabled={isRefunding}
        onConfirm={() => doRefund()}
      />

      <ConfirmDialog
        open={confirmAction === "cancel"}
        onOpenChange={open => !open && setConfirmAction(null)}
        title="Cancel order?"
        description="This marks the order as cancelled. You can issue a refund from this page after cancelling."
        confirmLabel="Cancel order"
        variant="destructive"
        confirmDisabled={isCancelling}
        onConfirm={() => doCancel()}
      />

      <ConfirmDialog
        open={confirmAction === "markRefunded"}
        onOpenChange={open => !open && setConfirmAction(null)}
        title="Mark as refunded?"
        description={order?.paymentMethod === "wallet" && order?.placedBy
          ? `${ghsp(order.amountGhs)} will be credited back to ${order.placedBy.businessName}'s wallet and a refund transaction will be logged in their ledger. The order status changes to Refunded.`
          : "The order status will change to Refunded. No automatic action is taken — this records that a Paystack refund was issued externally."}
        confirmLabel="Mark as refunded"
        confirmDisabled={isMarkingRefunded}
        onConfirm={() => doMarkRefunded()}
      />
    </AdminShell>
  );
}
