"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VendorShell } from "@/components/vendor/shell";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { getMe, changePassword, logout } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function VendorSettingsPage() {
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  const { data: meData, isLoading } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const user = meData?.user;

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

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    submitPasswordChange({ currentPassword, newPassword });
  }

  async function handleLogout() {
    await logout.fn();
    clearUser();
    router.push("/login");
  }

  return (
    <VendorShell
      walletBalance={user?.walletBalance ?? 0}
      vendorName={user?.businessName ?? user?.email ?? ""}
      vendorEmail={user?.email ?? ""}
    >
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-[600px] mx-auto">
        <div className="mb-6 md:mb-7">
          <h1 className="bh-display text-[24px] md:text-[28px] tracking-[-0.02em] mb-1">Settings</h1>
          <p className="text-[var(--ink-500)] text-sm m-0">Manage your account details.</p>
        </div>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
          <div className="font-bold text-[15px] mb-5">Profile</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Business name</Label>
              <div className="px-3.5 py-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-200)] text-[15px] text-[var(--ink-600)]">
                {isLoading ? <span className="opacity-40">—</span> : (user?.businessName ?? "—")}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Email</Label>
              <div className="px-3.5 py-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-200)] text-[15px] text-[var(--ink-600)]">
                {isLoading ? <span className="opacity-40">—</span> : user?.email}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Phone number</Label>
              <div className="px-3.5 py-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-200)] text-[15px] text-[var(--ink-600)]">
                {isLoading ? <span className="opacity-40">—</span> : (user?.phone ?? "—")}
              </div>
            </div>
          </div>
          <p className="mt-3.5 text-xs text-[var(--ink-500)]">
            To update your business name, email, or phone, contact the admin.
          </p>
        </Card>

        <Card className="p-4 md:p-6 gap-0 rounded-2xl border-[var(--ink-200)] mb-5">
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

        <div className="mt-5 p-4 md:p-5 border border-[var(--err-bg)] rounded-[14px]">
          <div className="font-bold text-sm text-[var(--err)] mb-1.5">Sign out</div>
          <p className="text-[13px] text-[var(--ink-600)] m-0 mb-3">
            This will end your current session on this device.
          </p>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="rounded-full px-[18px] py-2.5 h-auto text-[13px] font-semibold border-[var(--err)] text-[var(--err)] hover:bg-[var(--err-bg)] hover:text-[var(--err)] gap-1.5"
          >
            <Icon name="logout" size={14} /> Sign out
          </Button>
        </div>
      </div>
    </VendorShell>
  );
}
