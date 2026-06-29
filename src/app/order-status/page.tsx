"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function OrderStatusPage() {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  function handleLookup(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = ref.trim();
    if (!clean) {
      setError("Enter your order reference");
      return;
    }
    if (!/^[0-9A-Za-z]{6,8}$/.test(clean)) {
      setError("Order references are 6–8 letters or numbers");
      return;
    }
    router.push(`/order-status/${clean}`);
  }

  return (
    <div className="min-h-screen bg-[var(--ink-50)]">
      <VendorFlowBar />
      <div className="max-w-[480px] mx-auto px-6 pt-6 pb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[var(--ink-700)] no-underline"
        >
          <Icon name="arrow-left" size={16} /> Home
        </Link>

        <h1 className="bh-display text-[30px] leading-[1.05] tracking-[-0.03em] mt-4 mb-2">
          Check order status.
        </h1>
        <p className="text-[var(--ink-500)] m-0">
          Enter your order reference to see the latest status.
        </p>

        <form onSubmit={handleLookup} className="flex flex-col gap-3.5 mt-6">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-semibold text-[var(--ink-700)]">Order reference</Label>
            <Input
              value={ref}
              onChange={e => {
                setRef(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. ORab12CD"
              maxLength={8}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] bh-mono tracking-widest"
            />
            {error ? (
              <span className="text-xs text-red-500">{error}</span>
            ) : (
              <span className="text-xs text-[var(--ink-500)]">Case-sensitive. From your order confirmation.</span>
            )}
          </div>
          <Button
            type="submit"
            className="rounded-full px-7 py-4 h-auto text-base font-semibold gap-2"
          >
            <Icon name="search" size={16} /> Look up order
          </Button>
        </form>

        <Card className="mt-7 p-4 gap-0 rounded-xl border border-dashed border-[var(--ink-200)] bg-[var(--ink-100)] text-[13px] text-[var(--ink-600)] leading-relaxed">
          <div className="font-semibold mb-1 text-[var(--ink-900)]">Lost your reference?</div>
          We can&apos;t recover it from your phone number alone — that would let anyone look up anyone&apos;s order. WhatsApp our support line and we&apos;ll help.
        </Card>
      </div>
    </div>
  );
}
