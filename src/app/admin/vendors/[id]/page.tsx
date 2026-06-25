"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { NetMark } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ghsp } from "@/lib/data";
import { getAdminVendorDetail, updateVendorStatus, walletAdjustment, changeVendorPassword } from "@/api";
import toast from "react-hot-toast";

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved:  "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  pending:   "bg-[var(--warn-bg)] text-[var(--warn)] border-transparent",
  suspended: "bg-[var(--err-bg)] text-[var(--err)] border-transparent",
};

const TX_TYPE_BADGE_CLASS: Record<string, string> = {
  topup:      "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  purchase:   "bg-[var(--ink-100)] text-[var(--ink-600)] border-transparent",
  refund:     "bg-[var(--info-bg)] text-[var(--info)] border-transparent",
  adjustment: "bg-[var(--warn-bg)] text-[var(--warn)] border-transparent",
};

export default function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [showAdj, setShowAdj] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [confirmAction, setConfirmAction] = useState<"approve" | "suspend" | "reactivate" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getAdminVendorDetail.key(id),
    queryFn: () => getAdminVendorDetail.fn(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getAdminVendorDetail.key(id) });

  const { mutate: changeStatus, isPending: isChanging } = useMutation({
    mutationFn: (action: "approve" | "suspend" | "reactivate") => updateVendorStatus.fn(id, action),
    onSuccess: (_, action) => {
      const label = action === "approve" ? "Approved" : action === "suspend" ? "Suspended" : "Reactivated";
      toast.success(`${label} successfully`);
      setConfirmAction(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
    onError: () => toast.error("Action failed, please try again"),
  });

  const { mutate: doChangePassword, isPending: isChangingPwd } = useMutation({
    mutationFn: () => changeVendorPassword.fn(id, newPwd, confirmPwd),
    onSuccess: () => {
      toast.success("Password updated");
      setNewPwd("");
      setConfirmPwd("");
      setShowPwd(false);
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? "Failed to update password"),
  });

  const { mutate: applyAdjustment, isPending: isApplying } = useMutation({
    mutationFn: () => walletAdjustment.fn(id, Math.round(parseFloat(adjAmount) * 100), adjNote),
    onSuccess: () => {
      toast.success("Wallet adjustment applied");
      setAdjAmount("");
      setAdjNote("");
      setShowAdj(false);
      invalidate();
    },
    onError: () => toast.error("Adjustment failed, please try again"),
  });

  if (isLoading || !data) {
    return (
      <AdminShell>
        <div className="px-4 py-6 md:px-10 md:py-8 max-w-[1000px] mx-auto">
          <div className="h-8 w-48 bg-[var(--ink-100)] rounded animate-pulse mb-6" />
          <div className="h-40 bg-[var(--ink-100)] rounded-2xl animate-pulse" />
        </div>
      </AdminShell>
    );
  }

  const { vendor, recentTxns, recentOrders } = data;
  const adjAmountNum = parseFloat(adjAmount);
  const adjValid = !isNaN(adjAmountNum) && adjAmountNum !== 0 && adjNote.trim().length > 0;

  return (
    <AdminShell>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[1000px] mx-auto">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink-600)] no-underline mb-5"
        >
          <Icon name="arrow-left" size={14} /> Vendors
        </Link>

        <div className="flex flex-wrap justify-between items-start mb-7 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="bh-display text-[24px] md:text-[28px] m-0 tracking-[-0.02em]">{vendor.businessName}</h1>
              <Badge className={`rounded-full text-xs font-bold px-3 py-1 h-auto ${STATUS_BADGE_CLASS[vendor.status] ?? ""}`}>
                {vendor.status.toUpperCase()}
              </Badge>
            </div>
            <div className="text-sm text-[var(--ink-500)]">
              {vendor.email} · {vendor.phone} · Joined {new Date(vendor.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {vendor.status === "pending" && (
              <Button
                onClick={() => setConfirmAction("approve")}
                className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold bg-[var(--ok)] hover:bg-[var(--ok)]/90 text-white"
              >
                Approve vendor
              </Button>
            )}
            {vendor.status === "approved" && (
              <Button
                onClick={() => setConfirmAction("suspend")}
                variant="outline"
                className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold border-[var(--err)] text-[var(--err)] hover:bg-[var(--err-bg)] hover:text-[var(--err)]"
              >
                Suspend
              </Button>
            )}
            {vendor.status === "suspended" && (
              <Button
                onClick={() => setConfirmAction("reactivate")}
                className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold bg-[var(--warn)] hover:bg-[var(--warn)]/90 text-white"
              >
                Reactivate
              </Button>
            )}
            <Button
              onClick={() => setShowAdj(v => !v)}
              className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold bg-[var(--ink-100)] text-[var(--ink-700)] hover:bg-[var(--ink-200)] border-transparent gap-1.5"
            >
              <Icon name="wallet" size={14} /> Wallet adjustment
            </Button>
            <Button
              onClick={() => setShowPwd(v => !v)}
              className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold bg-[var(--ink-100)] text-[var(--ink-700)] hover:bg-[var(--ink-200)] border-transparent gap-1.5"
            >
              <Icon name="lock" size={14} /> Change password
            </Button>
          </div>
        </div>

        {showPwd && (
          <Card className="p-4 md:p-5 gap-0 rounded-2xl border border-[var(--ink-200)] mb-6">
            <div className="font-bold text-sm mb-3.5">Change vendor password</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">New password</Label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] w-[220px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Confirm password</Label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] w-[220px]"
                />
              </div>
              <Button
                disabled={newPwd.length < 8 || newPwd !== confirmPwd || isChangingPwd}
                onClick={() => doChangePassword()}
                className="rounded-xl px-5 py-3 h-auto text-[13px] font-semibold bg-[var(--ink-900)] hover:bg-[var(--ink-800)] disabled:bg-[var(--ink-200)] disabled:text-[var(--ink-400)]"
              >
                {isChangingPwd ? "Saving…" : "Update"}
              </Button>
            </div>
            {newPwd.length > 0 && confirmPwd.length > 0 && newPwd !== confirmPwd && (
              <p className="mt-2 text-xs text-[var(--err)]">Passwords do not match.</p>
            )}
          </Card>
        )}

        {showAdj && (
          <Card className="p-4 md:p-5 gap-0 rounded-2xl border border-[var(--warn-bg)] mb-6">
            <div className="font-bold text-sm mb-3.5">Manual wallet adjustment</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Amount (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50 or -20"
                  value={adjAmount}
                  onChange={e => setAdjAmount(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] w-[180px]"
                />
                {adjAmount && !isNaN(adjAmountNum) && (
                  <span className="text-xs text-[var(--ink-500)]">
                    {adjAmountNum > 0 ? "+" : ""}{ghsp(Math.round(adjAmountNum * 100))}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                  Reason <span className="text-[var(--err)]">*</span>
                </Label>
                <Input
                  placeholder="Required — explain this adjustment"
                  value={adjNote}
                  onChange={e => setAdjNote(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                />
              </div>
              <Button
                disabled={!adjValid || isApplying}
                onClick={() => applyAdjustment()}
                className="rounded-xl px-5 py-3 h-auto text-[13px] font-semibold bg-[var(--ink-900)] hover:bg-[var(--ink-800)] disabled:bg-[var(--ink-200)] disabled:text-[var(--ink-400)]"
              >
                Apply
              </Button>
            </div>
            <p className="mt-2.5 text-xs text-[var(--ink-500)]">
              Positive credits the wallet; negative debits it. Logged and visible to the vendor.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <div className="flex flex-col gap-5">
            <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
              <div className="font-bold text-[15px] mb-4">Wallet</div>
              <div className="mb-4">
                <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-1">Current balance</div>
              <div className="bh-display text-[28px] md:text-[30px] tracking-[-0.02em]">{ghsp(vendor.walletBalance)}</div>
              </div>
              <div className="border-t border-[var(--ink-100)] pt-3.5">
                <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2.5">Recent transactions</div>
                {recentTxns.length === 0 ? (
                  <div className="text-sm text-[var(--ink-400)] py-3">No transactions yet.</div>
                ) : recentTxns.map(tx => (
                  <div key={tx._id} className="flex justify-between items-center py-2 border-b border-[var(--ink-50)]">
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-full text-[10px] font-bold px-1.5 py-0.5 h-auto ${TX_TYPE_BADGE_CLASS[tx.type] ?? ""}`}>
                        {tx.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-[var(--ink-600)]">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span
                      className="bh-mono text-[13px] font-bold"
                      style={{ color: tx.amountGhs > 0 ? "var(--ok)" : "var(--ink-900)" }}
                    >
                      {tx.amountGhs > 0 ? "+" : ""}{ghsp(tx.amountGhs)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4 md:p-5 gap-0 rounded-2xl border-[var(--ink-200)]">
            <div className="font-bold text-[15px] mb-4">Orders ({recentOrders.length})</div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-[var(--ink-500)] text-sm">No orders placed yet.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentOrders.map(o => (
                  <div key={o._id} className="flex items-center gap-2.5 py-2.5 border-b border-[var(--ink-50)]">
                    <NetMark network={o.networkSnapshot} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold">{o.bundleNameSnapshot}</div>
                      <div className="bh-mono text-[11px] text-[var(--ink-500)]">{o.reference}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="bh-mono text-[13px] font-semibold">{ghsp(o.amountGhs)}</div>
                      <div className="mt-0.5"><StatusBadge status={o.status.toUpperCase()} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {confirmAction && (() => {
        const cfg = {
          approve:    { title: `Approve ${vendor.businessName}?`,    description: "They'll get immediate access to the vendor console.", confirmLabel: "Approve",    variant: "default"      },
          suspend:    { title: `Suspend ${vendor.businessName}?`,    description: "They lose access to their console immediately.",       confirmLabel: "Suspend",    variant: "destructive"  },
          reactivate: { title: `Reactivate ${vendor.businessName}?`, description: "Restores their full vendor console access.",            confirmLabel: "Reactivate", variant: "default"      },
        }[confirmAction] as { title: string; description: string; confirmLabel: string; variant: "default" | "destructive" };
        return (
          <ConfirmDialog
            open
            onOpenChange={open => !open && setConfirmAction(null)}
            {...cfg}
            confirmDisabled={isChanging}
            onConfirm={() => changeStatus(confirmAction)}
          />
        );
      })()}
    </AdminShell>
  );
}
