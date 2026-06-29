"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { NetMark } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { getBundles, type PublicBundle } from "@/api";
import { ghsp } from "@/lib/data";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";

const NETWORK_LABELS: Record<string, string> = {
  mtn:        "MTN",
  telecel:    "Telecel",
  airteltigo: "AirtelTigo",
};

export default function BundlesPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = String(params.network).toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: getBundles.key(networkId),
    queryFn: () => getBundles.fn(networkId),
  });

  const bundles = data?.bundles ?? [];
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    if (bundles.length && !sel) {
      setSel(bundles[0]?._id ?? null);
    }
  }, [bundles, sel]);

  const selected = bundles.find(b => b._id === sel) ?? bundles[0];
  const networkLabel = NETWORK_LABELS[networkId] ?? networkId.toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--ink-50)]">
      <VendorFlowBar />
      <div className="max-w-[480px] mx-auto px-6 pb-24 relative">
        <div className="pt-6">
          <Link href="/networks" className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-[var(--ink-700)] no-underline">
            <Icon name="arrow-left" size={16} /> Back
          </Link>
        </div>

        <div className="flex items-center gap-3 mt-4 mb-1.5">
          <NetMark network={networkId.toUpperCase()} size="sm" />
          <div className="text-[13px] text-[var(--brand-500)] font-bold uppercase tracking-widest">Step 2 / 3</div>
        </div>
        <h1 className="bh-display text-[30px] leading-[1.05] tracking-[-0.03em] m-0">
          Choose a {networkLabel} bundle.
        </h1>
        <p className="text-[var(--ink-500)] mt-2 mb-5">
          {isLoading ? "Loading packages…" : `${bundles.length} package${bundles.length !== 1 ? "s" : ""} available.`}
        </p>

        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[76px] rounded-2xl bg-[var(--ink-100)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {bundles.map((b: PublicBundle) => {
              const active = sel === b._id;
              return (
                <label
                  key={b._id}
                  className={`flex items-center gap-3.5 p-4 rounded-2xl cursor-pointer transition-colors ${
                    active
                      ? "border-2 border-[var(--brand-500)] bg-[var(--brand-50)]"
                      : "border border-[var(--ink-200)] bg-[var(--ink-100)]"
                  }`}
                >
                  <input type="radio" name="bundle" checked={active} onChange={() => setSel(b._id)} className="hidden" />
                  <div className="flex-1">
                    <div className="bh-display text-[22px]">{b.name}</div>
                    <div className="text-[13px] text-[var(--ink-500)] mt-0.5">Valid for {b.validity}</div>
                  </div>
                  {b.vendorPriceGhs != null ? (
                    <div className="flex flex-col items-end gap-0">
                      <span className="text-[13px] text-[var(--ink-400)] line-through leading-none">{ghsp(b.priceGhs)}</span>
                      <span className="bh-display text-[22px] text-[var(--brand-500)] leading-tight">{ghsp(b.vendorPriceGhs)}</span>
                    </div>
                  ) : (
                    <div className="bh-display text-[22px]">{ghsp(b.priceGhs)}</div>
                  )}
                  <span
                    className="size-[22px] rounded-full shrink-0 bg-[var(--ink-100)]"
                    style={{
                      border: active ? "6px solid var(--brand-500)" : "2px solid var(--ink-300)",
                    }}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-[var(--ink-100)] border-t border-[var(--ink-200)] shadow-[0_-8px_24px_rgba(11,18,32,0.04)] flex justify-center">
        <div className="w-full max-w-[448px]">
          <Button
            disabled={!selected}
            onClick={() => selected && router.push(`/checkout?network=${networkId}&bundleId=${selected._id}`)}
            className="w-full rounded-full px-7 py-4 h-auto text-base font-semibold gap-2 shadow-[0_6px_20px_-8px_var(--brand-500)]"
          >
            Continue with {selected?.name ?? "…"} <Icon name="arrow-right" size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
