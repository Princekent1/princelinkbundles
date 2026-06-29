"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { getMe, changePassword, getFulfillmentSettings, updateFulfillmentSettings } from "@/api";
import toast from "react-hot-toast";

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--brand-500)]" : "bg-[var(--ink-200)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: meData, isLoading } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const user = meData?.user;

  const { data: fulfillment, isLoading: fulfillmentLoading } = useQuery({
    queryKey: getFulfillmentSettings.key,
    queryFn: getFulfillmentSettings.fn,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate: submitPasswordChange, isPending } = useMutation({
    mutationFn: changePassword.fn,
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const { mutate: updateSettings } = useMutation({
    mutationFn: updateFulfillmentSettings.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFulfillmentSettings.key });
    },
    onError: (err: { message: string }) => toast.error(err.message ?? "Failed to update settings"),
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    submitPasswordChange({ currentPassword, newPassword });
  }

  return (
    <AdminShell>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[600px] mx-auto">
        <div className="mb-6 md:mb-7">
          <h1 className="bh-display text-[28px] tracking-[-0.02em] mb-1">Settings</h1>
          <p className="text-[var(--ink-500)] text-sm m-0">Manage your admin account and fulfillment preferences.</p>
        </div>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-[15px]">Fulfillment</div>
            {fulfillment?.jaybartBalance != null && (
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--ok-bg)] text-[oklch(0.40_0.18_150)]">
                Jaybart balance: GHS {parseFloat(fulfillment.jaybartBalance).toFixed(2)}
              </div>
            )}
          </div>
          <p className="text-[13px] text-[var(--ink-500)] mb-5 mt-1">
            When enabled, data bundles are sent automatically via Jaybart as soon as payment is confirmed — no admin action needed. Bundles without a Jaybart mapping are skipped and stay in the queue.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm">Auto-send for guests</div>
                <div className="text-xs text-[var(--ink-500)] mt-0.5">
                  Automatically fulfil orders placed by unregistered customers
                </div>
              </div>
              <ToggleSwitch
                checked={fulfillment?.autoSendGuests ?? false}
                disabled={fulfillmentLoading}
                onChange={(v) => updateSettings({ autoSendGuests: v })}
              />
            </div>
            <div className="h-px bg-[var(--ink-100)]" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm">Auto-send for vendors</div>
                <div className="text-xs text-[var(--ink-500)] mt-0.5">
                  Automatically fulfil orders placed by approved vendor accounts
                </div>
              </div>
              <ToggleSwitch
                checked={fulfillment?.autoSendVendors ?? false}
                disabled={fulfillmentLoading}
                onChange={(v) => updateSettings({ autoSendVendors: v })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
          <div className="font-bold text-[15px] mb-1">Payments</div>
          <p className="text-[13px] text-[var(--ink-500)] mb-5 mt-1">
            Control how Paystack processing fees are handled for guest checkout and vendor wallet top-ups.
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Pass Paystack fees to customers</div>
              <div className="text-xs text-[var(--ink-500)] mt-0.5">
                Adds a {((fulfillment?.paystackFeeRateBps ?? 195) / 100).toFixed(2)}% Paystack fee to Paystack payments
              </div>
            </div>
            <ToggleSwitch
              checked={fulfillment?.passPaystackFeesToCustomers ?? false}
              disabled={fulfillmentLoading}
              onChange={(v) => updateSettings({ passPaystackFeesToCustomers: v })}
            />
          </div>
        </Card>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
          <div className="font-bold text-[15px] mb-1">Vendors</div>
          <p className="text-[13px] text-[var(--ink-500)] mb-5 mt-1">
            Control how vendor accounts are handled when they sign up.
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Auto-approve registrations</div>
              <div className="text-xs text-[var(--ink-500)] mt-0.5">
                Newly registered vendor accounts are approved immediately without admin review
              </div>
            </div>
            <ToggleSwitch
              checked={fulfillment?.autoApproveVendors ?? false}
              disabled={fulfillmentLoading}
              onChange={(v) => updateSettings({ autoApproveVendors: v })}
            />
          </div>
        </Card>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
          <div className="font-bold text-[15px] mb-5">Profile</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Name</Label>
              <div className="px-3.5 py-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-200)] text-[15px] text-[var(--ink-600)]">
                {isLoading ? <span className="opacity-40">—</span> : (user?.businessName ?? user?.email ?? "—")}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Email</Label>
              <div className="px-3.5 py-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-200)] text-[15px] text-[var(--ink-600)]">
                {isLoading ? <span className="opacity-40">—</span> : user?.email}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)]">
          <div className="font-bold text-[15px] mb-5">Change password</div>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Current password</Label>
              <PasswordInput
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">New password</Label>
              <PasswordInput
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Confirm new password</Label>
              <PasswordInput
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-full px-6 py-3.5 h-auto text-sm font-semibold self-start gap-2 bg-[var(--ink-900)] hover:bg-[var(--ink-800)] shadow-none disabled:opacity-50"
            >
              {isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
