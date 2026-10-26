"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ghsp } from "@/lib/data";
import { getMe, getSignupFeeStatus, initSignupFee, verifySignupFee, logout } from "@/api";
import toast from "react-hot-toast";

function SignupFeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: meData, isLoading: meLoading } = useQuery({ queryKey: getMe.key, queryFn: getMe.fn });
  const { data, isLoading, refetch } = useQuery({
    queryKey: getSignupFeeStatus.key,
    queryFn: getSignupFeeStatus.fn,
  });

  const user = meData?.user;

  useEffect(() => {
    if (!meLoading && user && user.status !== "pending") {
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/vendor/dashboard");
    }
  }, [meLoading, user, router]);

  useEffect(() => {
    if (!isLoading && data && (!data.required || data.status === "success")) {
      router.replace("/pending");
    }
  }, [isLoading, data, router]);

  // back from FloatVault's checkout: keep confirming the payment until it settles
  const [returnedRef, setReturnedRef] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("fee") === "success") {
      const ref = searchParams.get("ref");
      if (ref) setReturnedRef(ref);
      refetch();
      router.replace("/vendor/signup-fee");
    }
  }, [searchParams, refetch, router]);

  const { mutate: startPayment, isPending: starting } = useMutation({
    mutationFn: initSignupFee.fn,
    onSuccess: (result) => {
      const url = result.checkoutUrl ?? result.paystackUrl;
      if (url) window.location.href = url;
    },
    onError: (err: { message: string }) => toast.error(err.message ?? "Failed to start payment"),
  });

  const handleVerified = async (result: Awaited<ReturnType<typeof verifySignupFee.fn>>, quiet = false) => {
      if ("paid" in result && result.paid) {
        if (result.approved) {
          toast.success("Payment confirmed — your account is approved! Please log in again to continue.");
          await logout.fn();
          router.push("/login");
        } else {
          toast.success("Payment confirmed. Your application is now with an admin for review.");
          router.push("/pending");
        }
      } else if ("alreadyProcessed" in result) {
        toast(result.status === "success" ? "Payment already confirmed" : "That payment did not succeed");
        refetch();
      } else if ("paid" in result && !result.paid && !quiet) {
        toast.error(`Payment not confirmed yet (status: ${result.paystackStatus})`);
      }
  };

  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: (reference: string) => verifySignupFee.fn(reference),
    onSuccess: (result) => handleVerified(result),
    onError: (err: { message: string }) => toast.error(err.message ?? "Verification failed"),
  });

  const { data: watched } = useQuery({
    queryKey: ["vendor", "signup-fee", "watch", returnedRef],
    queryFn: () => verifySignupFee.fn(returnedRef!),
    enabled: !!returnedRef,
    refetchInterval: (query) => {
      const result = query.state.data;
      return result && ("alreadyProcessed" in result || ("paid" in result && result.paid)) ? false : 3000;
    },
  });

  useEffect(() => {
    if (!watched || !returnedRef) return;
    if ("alreadyProcessed" in watched || ("paid" in watched && watched.paid)) {
      setReturnedRef(null);
      handleVerified(watched, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: getMe.key });
  }, [data?.status, queryClient]);

  return (
    <div className="min-h-screen bg-[var(--ink-50)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-[440px] w-full text-center">
        <Wordmark small />

        <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
          <Icon name="wallet" size={28} />
        </div>

        <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">
          One more step.
        </h1>

        {isLoading || meLoading ? (
          <div className="h-20 rounded-2xl bg-[var(--ink-100)] animate-pulse mb-7" />
        ) : (
          <>
            <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">
              {data?.status === "pending"
                ? "We're confirming your payment. This is usually instant — you can check again below."
                : "Pay the vendor signup fee to complete your application."}
            </p>

            <Card className="p-5 gap-0 rounded-[14px] border-[var(--ink-200)] bg-[var(--ink-100)] mb-7">
              <div className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-1.5">Signup fee</div>
              <div className="bh-display text-[32px] tracking-[-0.02em] mb-4">{ghsp(data?.amountGhs ?? 0)}</div>

              {data?.status === "pending" ? (
                <Button
                  onClick={() => data.reference && verify(data.reference)}
                  disabled={verifying || !data.reference}
                  className="w-full rounded-full px-6 py-3.5 h-auto text-sm font-semibold gap-2"
                >
                  {verifying ? "Checking…" : "Check payment status"}
                </Button>
              ) : (
                <Button
                  onClick={() => startPayment()}
                  disabled={starting}
                  className="w-full rounded-full px-6 py-3.5 h-auto text-sm font-semibold gap-2"
                >
                  {starting ? "Redirecting…" : <>Pay with Paystack <Icon name="arrow-right" size={16} /></>}
                </Button>
              )}
            </Card>
          </>
        )}

        <Button asChild variant="outline" className="rounded-full px-6 py-3 h-auto text-sm font-semibold gap-1.5">
          <Link href="/login">
            <Icon name="arrow-left" size={14} /> Back to sign in
          </Link>
        </Button>
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
