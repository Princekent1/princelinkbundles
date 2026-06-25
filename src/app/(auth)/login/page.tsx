"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card } from "@/components/ui/card";
import { login, StrippedError } from "@/api";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ToastMessage } from "@/components/ui/toast-message";
import { useAuthStore } from "@/stores/auth";
import type { TokenPayload } from "@/lib/jwt";

export type LoginFields = {
  identifier: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const { control, handleSubmit } = useForm<LoginFields>({ defaultValues: { identifier: "", password: "" } });

  const { mutate: loginMutation, isPending: isSubmitting } = useMutation({
    mutationFn: login.fn,
    onSuccess: (data: { user: TokenPayload }) => {
      setUser(data.user);
      if (data.user.role === "admin") {
        toast.success(<ToastMessage title="Login Successful!" />);
        router.push("/admin/dashboard");
      } else if (data.user.status === "pending") {
        router.push("/pending");
      } else {
        toast.success(<ToastMessage title="Login Successful!" />);
        router.push("/vendor/dashboard");
      }
    },
    onError: (error: StrippedError) => {
      toast.error(<ToastMessage title={error.message} description={error.details} />);
    },
  });

  function onSubmit(data: LoginFields) {
    const isPhone = !data.identifier.includes("@");
    const identifier = isPhone
      ? "0" + data.identifier.replace(/\D/g, "").slice(-9)
      : data.identifier.trim();
    loginMutation({ ...data, identifier });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[480px] mx-auto px-6 pt-10 pb-16">
        <div className="mb-8">
          <Wordmark small />
        </div>

        <h1 className="bh-display text-[30px] leading-[1.05] tracking-[-0.03em] mb-1.5">
          Welcome back.
        </h1>
        <p className="text-[var(--ink-500)] text-sm mb-7">
          Sign in to your vendor or admin account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Email or phone</Label>
            <Controller
              name="identifier"
              control={control}
              rules={{ required: "Email or phone is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    autoComplete="username"
                    placeholder="you@example.com or 0XX XXX XXXX"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && (
                    <span className="text-xs text-red-500">{fieldState.error.message}</span>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Password</Label>
            <Controller
              name="password"
              control={control}
              rules={{ required: "Password is required" }}
              render={({ field, fieldState }) => (
                <>
                  <PasswordInput
                    {...field}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && (
                    <span className="text-xs text-red-500">{fieldState.error.message}</span>
                  )}
                </>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full px-7 py-4 h-auto text-base font-semibold mt-1 shadow-[0_6px_20px_-8px_var(--brand-500)] disabled:shadow-none gap-2"
          >
            {isSubmitting ? "Signing in…" : <>Sign in <Icon name="arrow-right" size={16} /></>}
          </Button>
        </form>

        <div className="mt-6 text-sm text-[var(--ink-600)]">
          New vendor?{" "}
          <Link href="/signup" className="text-[var(--brand-500)] font-semibold no-underline">
            Create an account
          </Link>
        </div>

        <Card className="mt-8 p-3.5 gap-0 rounded-xl bg-white border border-dashed border-[var(--ink-200)] text-[13px] text-[var(--ink-600)] leading-relaxed">
          <div className="font-semibold text-[var(--ink-900)] mb-1">Buying as a guest?</div>
          No account needed — pick a network and pay directly.
          <Link href="/networks" className="mt-1.5 inline-flex items-center gap-1 text-[var(--ink-700)] no-underline text-[13px] font-semibold">
            Browse bundles <Icon name="arrow-right" size={14} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
