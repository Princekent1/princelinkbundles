"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Wordmark } from "@/components/ui/wordmark";
import { NetMark } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { getBundles, type PublicBundle } from "@/api";
import { ghsp } from "@/lib/data";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";

const NETWORKS = [
  { id: "mtn",        label: "MTN" },
  { id: "telecel",    label: "Telecel" },
  { id: "airteltigo", label: "AirtelTigo" },
] as const;

function networkStats(bundles: PublicBundle[], networkId: string) {
  const nets = bundles.filter(b => b.network === networkId);
  if (!nets.length) return { count: 0, minPrice: 0 };
  return {
    count: nets.length,
    minPrice: Math.min(...nets.map(b => b.vendorPriceGhs ?? b.priceGhs)),
  };
}

export default function NetworksPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: getBundles.key(),
    queryFn: () => getBundles.fn(),
  });

  const bundles = data?.bundles ?? [];

  return (
    <div className="min-h-screen bg-white">
      <VendorFlowBar />
      <div className="max-w-[480px] mx-auto px-6 pb-24">
        <div className="pt-6 flex items-center justify-between mb-6">
          <Wordmark small />
          <Link href="/order-status" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-[var(--ink-700)] no-underline">
            Order status
          </Link>
        </div>

        <div className="text-[13px] text-[var(--brand-500)] font-bold uppercase tracking-widest mb-2">Step 1 / 3</div>
        <h1 className="bh-display text-[32px] leading-[1.05] tracking-[-0.03em] m-0">Pick a network.</h1>
        <p className="text-[var(--ink-500)] mt-2 mb-6">Choose the SIM that will receive the data.</p>

        <div className="flex flex-col gap-3">
          {NETWORKS.map(n => {
            const { count, minPrice } = networkStats(bundles, n.id);
            return (
              <Link
                key={n.id}
                href={`/bundles/${n.id}`}
                className="bg-white border border-[var(--ink-200)] rounded-2xl p-4 flex items-center gap-4 no-underline text-inherit hover:border-[var(--brand-300)] transition-colors"
              >
                <NetMark network={n.id.toUpperCase()} />
                <div className="flex-1">
                  <div className="font-bold text-[17px]">{n.label}</div>
                  <div className="text-[13px] text-[var(--ink-500)]">
                    {isLoading
                      ? "Loading packages…"
                      : isError
                      ? "Couldn’t load packages"
                      : count > 0
                      ? `${count} package${count !== 1 ? "s" : ""} · from ${ghsp(minPrice)}`
                      : "No packages available"}
                  </div>
                </div>
                <Icon name="arrow-right" size={18} />
              </Link>
            );
          })}
        </div>

        <Card className="mt-6 p-4 gap-0 rounded-xl bg-[var(--brand-50)] border border-[var(--brand-100)] flex flex-row items-start gap-2.5">
          <Icon name="info" size={18} />
          <div className="text-[13px] text-[var(--ink-700)] leading-relaxed">
            We don&apos;t support SIMs with airtime debt, broadband, EVD, transfer or merchant SIMs.
          </div>
        </Card>
      </div>
    </div>
  );
}
