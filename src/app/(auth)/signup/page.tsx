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
import { signUp, StrippedError } from "@/api";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ToastMessage } from "@/components/ui/toast-message";

export type SignupFields = {
  businessName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function SignupPage() {
  const router = useRouter();
  const { control, handleSubmit, watch } = useForm<SignupFields>();
  const newPassword = watch("password");

  const { mutate: signUpMutation, isPending: isSubmitting } = useMutation({
    mutationFn: signUp.fn,
    onSuccess: (data) => {
      if (data.autoApproved) {
        toast.success(<ToastMessage title="Account approved!" description="Welcome aboard." />);
        router.push("/vendor/dashboard");
      } else {
        toast.success(<ToastMessage title="Sign up successful!" />);
        router.push("/pending");
      }
    },
    onError: (error: StrippedError) => {
      toast.error(<ToastMessage title={error.message} description={error.details} />);
    },
  })

  function onSubmit(data: SignupFields) {
    const digits = data.phone.replace(/\D/g, "");
    signUpMutation({ ...data, phone: "0" + digits.slice(-9) });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[480px] mx-auto px-6 pt-10 pb-16">
        <Wordmark small />

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[var(--ink-700)] no-underline mt-6"
        >
          <Icon name="arrow-left" size={16} /> Back to sign in
        </Link>

        <h1 className="bh-display text-[30px] leading-[1.05] tracking-[-0.03em] mt-5 mb-1.5">
          Become a vendor.
        </h1>
        <p className="text-[var(--ink-500)] text-sm mb-7">
          Submit your details and we&apos;ll review your application. You&apos;ll be able to log in once approved.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Business name</Label>
            <Controller
              name="businessName"
              control={control}
              rules={{ required: "Business name is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    placeholder="e.g. DataFrat GH"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && <span className="text-xs text-red-500">{fieldState.error.message}</span>}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Email</Label>
            <Controller
              name="email"
              control={control}
              rules={{
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    type="email"
                    placeholder="you@example.com"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && <span className="text-xs text-red-500">{fieldState.error.message}</span>}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Phone number</Label>
            <Controller
              name="phone"
              control={control}
              rules={{
                required: "Phone number is required",
                validate: (v) => /^0\d{9}$/.test(v.replace(/\D/g, "")) || "Enter a valid 10-digit Ghana phone number",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="0XX XXX XXXX"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error
                    ? <span className="text-xs text-red-500">{fieldState.error.message}</span>
                    : <span className="text-xs text-[var(--ink-500)]">Your contact number — not the SIM receiving data.</span>
                  }
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Password</Label>
            <Controller
              name="password"
              control={control}
              rules={{ required: "Password is required", minLength: { value: 8, message: "Password must be at least 8 characters" } }}
              render={({ field, fieldState }) => (
                <>
                  <PasswordInput
                    {...field}
                    placeholder="Min. 8 characters"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && <span className="text-xs text-red-500">{fieldState.error.message}</span>}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Confirm password</Label>
            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Please confirm your password",
                validate: (v) => v === newPassword || "Passwords do not match",
              }}
              render={({ field, fieldState }) => (
                <>
                  <PasswordInput
                    {...field}
                    placeholder="Repeat password"
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-white px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
                  />
                  {fieldState.error && <span className="text-xs text-red-500">{fieldState.error.message}</span>}
                </>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full px-7 py-4 h-auto text-base font-semibold mt-1 gap-2 shadow-[0_6px_20px_-8px_var(--brand-500)] disabled:shadow-none"
          >
            {isSubmitting ? "Submitting…" : <>Submit application <Icon name="arrow-right" size={16} /></>}
          </Button>
        </form>

        <p className="mt-5 text-[13px] text-[var(--ink-500)] leading-relaxed">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--brand-500)] font-semibold no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
