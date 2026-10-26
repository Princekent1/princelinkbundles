"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ghsp } from "@/lib/data";
import { useAuthStore } from "@/stores/auth";
import { getMe, getSignupFeeStatus, initSignupFee, verifySignupFee, refreshSession, logout } from "@/api";
import toast from "react-hot-toast";

const VERIFY_POLL_MS = 3000;
const RETRY_AFTER_MS = 30_000;
const FAST_APPROVAL_POLLS = 5;
const FAST_APPROVAL_POLL_MS = 3000;
const SLOW_APPROVAL_POLL_MS = 20_000;

type Screen = "loading" | "blocked" | "entering" | "pay" | "confirming" | "awaiting";

function SignupFeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  const { data: fee, isLoading: feeLoading } = useQuery({
    queryKey: getSignupFeeStatus.key,
    queryFn: getSignupFeeStatus.fn,
  });

  const awaitingApproval = !!fee && (!fee.required || fee.status === "success");

  const { data: meData, isLoading: meLoading, isError: meFailed } = useQuery({
    queryKey: getMe.key,
    queryFn: getMe.fn,
    refetchInterval: (query) => {
      if (!awaitingApproval || query.state.data?.user.status !== "pending") return false;
      return query.state.dataUpdateCount < FAST_APPROVAL_POLLS ? FAST_APPROVAL_POLL_MS : SLOW_APPROVAL_POLL_MS;
    },
  });

  const user = meData?.user;
  const confirming = fee?.status === "pending" && !!fee.reference;

  const refetchStatus = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getSignupFeeStatus.key }),
      queryClient.invalidateQueries({ queryKey: getMe.key }),
    ]);

  const { mutate: enterApp, isIdle: canEnterApp, isError: enterFailed } = useMutation({
    mutationFn: refreshSession.fn,
    onSuccess: ({ user: refreshed }) => {
      setUser(refreshed);
      router.replace(refreshed.role === "admin" ? "/admin/dashboard" : "/vendor/dashboard");
    },
    onError: (err: { message: string }) => toast.error(err.message ?? "Couldn't open your dashboard"),
  });

  const { mutate: startPayment, isPending: starting } = useMutation({
    mutationFn: initSignupFee.fn,
    onSuccess: (result) => {
      if (result.alreadyPaid) {
        refetchStatus();
        return;
      }
      const url = result.checkoutUrl ?? result.paystackUrl;
      if (url) window.location.href = url;
    },
    onError: (err: { message: string }) => toast.error(err.message ?? "Failed to start payment"),
  });

  const { mutate: signOut, isPending: signingOut } = useMutation({
    mutationFn: logout.fn,
    onSuccess: () => {
      clearUser();
      router.push("/login");
    },
  });

  const { data: verified } = useQuery({
    queryKey: ["vendor", "signup-fee", "verify", fee?.reference],
    queryFn: () => verifySignupFee.fn(fee!.reference!),
    enabled: confirming,
    refetchInterval: VERIFY_POLL_MS,
  });

  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    setCanRetry(false);
    if (!confirming) return;
    const timer = setTimeout(() => setCanRetry(true), RETRY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [confirming, fee?.reference]);

  useEffect(() => {
    if (searchParams.get("fee")) {
      refetchStatus();
      router.replace("/vendor/signup-fee");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  useEffect(() => {
    if (!verified) return;
    if ("alreadyProcessed" in verified || verified.paid) refetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  useEffect(() => {
    if (user?.status === "approved" && canEnterApp) enterApp();
  }, [user?.status, canEnterApp, enterApp]);

  useEffect(() => {
    if (meFailed) router.replace("/login");
  }, [meFailed, router]);

  const screen: Screen = (() => {
    if (meLoading || feeLoading || !user || !fee) return "loading";
    if (user.status === "approved") return "entering";
    if (user.status !== "pending") return "blocked";
    if (awaitingApproval) return "awaiting";
    if (confirming) return "confirming";
    return "pay";
  })();

  const payButton = (label: string) => (
    <Button
      onClick={() => startPayment()}
      disabled={starting}
      className="w-full rounded-full px-6 py-3.5 h-auto text-sm font-semibold gap-2"
    >
      {starting ? "Redirecting…" : <>{label} <Icon name="arrow-right" size={16} /></>}
    </Button>
  );

  return (
    <div className="min-h-screen bg-[var(--ink-50)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-[440px] w-full text-center">
        <Wordmark small />

        {screen === "loading" && <div className="h-40 rounded-2xl bg-[var(--ink-100)] animate-pulse mt-8" />}

        {screen === "entering" && (
          <>
            <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
              <Icon name="check" size={28} />
            </div>
            <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">You&apos;re approved.</h1>
            <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">Taking you to your dashboard…</p>
            {enterFailed && (
              <Button onClick={() => enterApp()} className="rounded-full px-6 py-3 h-auto text-sm font-semibold gap-1.5">
                Continue to dashboard <Icon name="arrow-right" size={14} />
              </Button>
            )}
          </>
        )}

        {screen === "blocked" && (
          <>
            <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
              <Icon name="lock" size={28} />
            </div>
            <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">
              Account {user?.status === "suspended" ? "suspended" : "inactive"}.
            </h1>
            <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">
              This account can&apos;t be used right now. Contact support and mention your registered email address.
            </p>
          </>
        )}

        {(screen === "pay" || screen === "confirming") && (
          <>
            <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
              <Icon name="wallet" size={28} />
            </div>
            <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">
              {screen === "confirming"
                ? "Confirming your payment."
                : fee?.status === "failed"
                  ? "That payment didn't go through."
                  : "One more step."}
            </h1>
            <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">
              {screen === "confirming"
                ? "This usually takes a few seconds. This page updates by itself."
                : fee?.status === "failed"
                  ? "We didn't receive that payment. You can try again below."
                  : "Pay the vendor signup fee to complete your application."}
            </p>

            <Card className="p-5 gap-0 rounded-[14px] border-[var(--ink-200)] bg-[var(--ink-100)] mb-7">
              <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-1.5">Signup fee</div>
              <div className="bh-display text-[32px] tracking-[-0.02em] mb-4">{ghsp(fee?.amountGhs ?? 0)}</div>

              {screen === "pay" && payButton(`Pay ${ghsp(fee?.amountGhs ?? 0)}`)}

              {screen === "confirming" &&
                (canRetry ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[13px] text-[var(--ink-500)] m-0">Still waiting? If you didn&apos;t finish paying, start again.</p>
                    {payButton("Not paid? Try again")}
                  </div>
                ) : (
                  <div className="text-[13px] text-[var(--ink-500)]">Checking with your payment provider…</div>
                ))}
            </Card>
          </>
        )}

        {screen === "awaiting" && (
          <>
            <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
              <Icon name="lock" size={28} />
            </div>
            <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">Application under review.</h1>
            <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">
              {fee?.required
                ? "Your signup fee payment was received. Your vendor account is now pending admin approval."
                : "Your vendor account has been created and is pending admin approval."}{" "}
              Keep this page open and it will move on by itself once you&apos;re approved.
            </p>

            <Card className="p-4 gap-0 rounded-[14px] border-[var(--ink-200)] bg-[var(--ink-100)] text-[13px] text-[var(--ink-600)] leading-relaxed text-left mb-7">
              <div className="font-semibold text-[var(--ink-900)] mb-1.5">What happens next?</div>
              <ol className="m-0 pl-[18px] list-decimal flex flex-col gap-1.5">
                <li>The admin reviews your application, usually within 24 hours.</li>
                <li>Once approved, you&apos;re taken to your dashboard automatically, or just sign in later.</li>
                <li>Top up your wallet and start placing orders immediately.</li>
              </ol>
            </Card>

            <Card className="p-3.5 gap-0 rounded-xl border border-dashed border-[var(--ink-200)] bg-[var(--ink-100)] text-[13px] text-[var(--ink-600)] mb-7">
              <span className="font-semibold text-[var(--ink-900)]">Questions?</span>{" "}
              Contact support and mention your registered email address.
            </Card>
          </>
        )}

        {screen !== "loading" && screen !== "entering" && (
          <Button
            onClick={() => signOut()}
            disabled={signingOut}
            variant="outline"
            className="rounded-full px-6 py-3 h-auto text-sm font-semibold gap-1.5"
          >
            <Icon name="arrow-left" size={14} /> Sign out
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SignupFeePage() {
  return (
    <Suspense>
      <SignupFeeContent />
    </Suspense>
  );
}
