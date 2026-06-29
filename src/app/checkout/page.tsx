"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { NetMark, NetChip } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { getBundles, getMe, getPaymentSettings, createGuestOrder, createVendorOrder } from "@/api";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";
import { ghsp } from "@/lib/data";
import { calculatePaystackFee } from "@/lib/paystack-fees";
import toast from "react-hot-toast";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const networkId = searchParams.get("network") ?? "mtn";
  const bundleId = searchParams.get("bundleId") ?? "";

  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");

  const { data: bundlesData, isLoading: bundlesLoading } = useQuery({
    queryKey: getBundles.key(networkId),
    queryFn: () => getBundles.fn(networkId),
  });

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: getMe.key,
    queryFn: getMe.fn,
    retry: false,
  });

  const { data: paymentSettings } = useQuery({
    queryKey: getPaymentSettings.key,
    queryFn: getPaymentSettings.fn,
  });

  const bundle = bundlesData?.bundles.find(b => b._id === bundleId);
  const hasBundleSelection = Boolean(bundleId);
  const bundleUnavailable = !bundlesLoading && (!hasBundleSelection || !bundle);
  const isVendor = authData?.user?.role === "vendor";
  const walletBalance = authData?.user?.walletBalance ?? 0;
  const bundlePrice = bundle
    ? (isVendor && bundle.vendorPriceGhs != null ? bundle.vendorPriceGhs : bundle.priceGhs)
    : 0;
  const canAfford = isVendor && bundle ? walletBalance >= bundlePrice : false;
  const fee = bundle
    ? calculatePaystackFee(
        bundlePrice,
        !isVendor && (paymentSettings?.passPaystackFeesToCustomers ?? false),
        paymentSettings?.paystackFeeRateBps
      )
    : null;

  const { mutate: submitGuestOrder, isPending: guestPending } = useMutation({
    mutationFn: () => createGuestOrder.fn({
      bundleId: bundle!._id,
      customerPhone: "0" + phone.replace(/\D/g, "").slice(-9),
      customerEmail: email.trim() || undefined,
    }),
    onSuccess: (data) => {
      router.push(data.paystackUrl);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message ?? "Failed to create order");
    },
  });

  const { mutate: submitVendorOrder, isPending: vendorPending } = useMutation({
    mutationFn: () => createVendorOrder.fn({
      bundleId: bundle!._id,
      customerPhone: "0" + phone.replace(/\D/g, "").slice(-9),
    }),
    onSuccess: (data) => {
      const normalizedPhone = "0" + phone.replace(/\D/g, "").slice(-9);
      router.push(
        `/checkout/success?ref=${data.reference}&network=${networkId}&bundle=${encodeURIComponent(data.bundleName)}&validity=${encodeURIComponent(data.validityDays)}&phone=${encodeURIComponent(normalizedPhone)}&amount=${data.amountGhs}`
      );
    },
    onError: (err: { message: string }) => {
      toast.error(err.message ?? "Failed to place order");
    },
  });

  function validate() {
    const clean = phone.replace(/\D/g, "");
    const confirmClean = confirm.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(clean)) return "Enter a valid 10-digit Ghana phone number";
    if (clean !== confirmClean) return "Phone numbers don't match";
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (isVendor) {
      submitVendorOrder();
    } else {
      submitGuestOrder();
    }
  }

  const isPending = guestPending || vendorPending;

  return (
    <div className="min-h-screen bg-[var(--ink-50)]">
      <VendorFlowBar />
      <div className="max-w-[480px] mx-auto px-6 pb-[120px]">
        <div className="pt-6">
          <Link
            href={`/bundles/${networkId}`}
            className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[var(--ink-700)] no-underline"
          >
            <Icon name="arrow-left" size={16} /> Back
          </Link>
        </div>

        <div className="text-[13px] text-[var(--brand-500)] font-bold uppercase tracking-widest mt-3">
          Step 3 / 3
        </div>
        <h1 className="bh-display text-[30px] leading-[1.05] tracking-[-0.03em] m-0">
          Confirm and pay.
        </h1>

        <Card className="mt-5 p-[18px] gap-0 rounded-2xl border-[var(--ink-200)]">
          <div className="text-xs font-semibold uppercase text-[var(--ink-500)] tracking-wide">Your order</div>
          {bundlesLoading || !bundle ? (
            bundleUnavailable ? (
              <div className="mt-3 rounded-xl bg-[var(--err-bg)] border border-[var(--err)]/20 p-3 text-[13px] text-[var(--ink-700)] leading-relaxed">
                This checkout link is missing a valid bundle. Go back and choose a package again.
              </div>
            ) : (
              <div className="h-12 mt-3 rounded-xl bg-[var(--ink-100)] animate-pulse" />
            )
          ) : (
            <div className="flex items-center gap-3.5 mt-3">
              <NetMark network={networkId.toUpperCase()} />
              <div className="flex-1">
                <div className="font-bold text-base">{bundle.name} — {bundle.validity}</div>
                <NetChip network={networkId.toUpperCase()} />
              </div>
              <div className="bh-display text-[22px]">{ghsp(bundlePrice)}</div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3.5 mt-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">SIM that receives the data</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="0XX XXX XXXX"
              className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
            />
            <span className="text-xs text-[var(--ink-500)]">Double-check this. We can&apos;t refund if you send it to the wrong number.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Confirm number</Label>
            <Input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="0XX XXX XXXX"
              className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
            />
          </div>
          {!authLoading && !isVendor && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                Email <span className="text-[var(--ink-400)] font-normal">(optional, for receipt)</span>
              </Label>
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)]"
              />
            </div>
          )}
        </div>

        {isVendor && bundle && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--brand-50)] border border-[var(--brand-100)] flex justify-between items-center text-sm">
            <span className="text-[var(--ink-600)]">Wallet balance</span>
            <span className={`font-bold bh-mono ${canAfford ? "text-[var(--ink-900)]" : "text-red-600"}`}>
              {ghsp(walletBalance)}
            </span>
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-[var(--ink-200)] flex justify-between items-center">
          <div className="min-w-0">
            <div className="text-[13px] text-[var(--ink-500)]">Total</div>
            <div className="bh-display text-[30px]">{fee ? ghsp(fee.totalPayableGhs) : "—"}</div>
            {fee && fee.processingFeeGhs > 0 && (
              <div className="mt-1 text-xs text-[var(--ink-500)]">
                Bundle {ghsp(fee.baseAmountGhs)} + Paystack fee {ghsp(fee.processingFeeGhs)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
            <Icon name="shield" size={14} /> {authLoading ? "Checking account" : isVendor ? "Wallet payment" : "Paystack secured"}
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-[var(--ink-100)] border-t border-[var(--ink-200)] flex flex-col items-center">
        <div className="w-full max-w-[448px]">
          <Button
            onClick={handleSubmit}
            disabled={isPending || authLoading || bundlesLoading || !bundle || bundleUnavailable || (isVendor && !canAfford)}
            className="w-full rounded-full px-7 py-4 h-auto text-base font-semibold gap-2"
          >
            {isPending
              ? "Placing order…"
              : authLoading
              ? "Checking account…"
              : bundleUnavailable
              ? "Choose a valid bundle"
              : isVendor
              ? canAfford
                ? `Pay with Wallet · ${bundle ? ghsp(bundlePrice) : ""}`
                : "Insufficient balance"
              : `Pay with Mobile Money${fee ? ` · ${ghsp(fee.totalPayableGhs)}` : ""}`}
            {!isPending && <Icon name="arrow-right" size={18} />}
          </Button>
          {!authLoading && !isVendor && (
            <div className="text-center mt-2 text-[11px] text-[var(--ink-500)]">
              You&apos;ll be redirected to Paystack&apos;s secure checkout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
