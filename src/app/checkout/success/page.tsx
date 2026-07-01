"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { NetChip } from "@/components/ui/network-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icons";
import { formatValidity } from "@/lib/bundle-name";
import { ghsp } from "@/lib/data";
import { lookupOrder } from "@/api";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";
import toast from "react-hot-toast";

function SuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: lookupOrder.key(ref),
    queryFn: () => lookupOrder.fn(ref),
    enabled: !!ref,
    refetchInterval: (query) =>
      query.state.data?.status === "pending_payment" ? 3000 : false,
  });

  function copyRef() {
    if (!ref) return;
    navigator.clipboard
      .writeText(ref)
      .then(() => toast.success("Reference copied"))
      .catch(() => toast.error("Could not copy reference"));
  }

  const rows: [string, React.ReactNode][] = data
    ? ([
        ["Bundle", `${data.bundleNameSnapshot}${data.validityDays ? ` — ${formatValidity(data.validityDays)}` : ""}`],
        ["Network", <NetChip key="network" network={data.networkSnapshot.toUpperCase()} />],
        ["Phone", data.customerPhone],
        ["Bundle amount", <span key="base" className="bh-mono">{ghsp(data.amountGhs)}</span>],
        data.processingFeeGhs > 0 ? ["Paystack fee", <span key="fee" className="bh-mono">{ghsp(data.processingFeeGhs)}</span>] : null,
        ["Amount paid", <span key="amount" className="bh-mono">{ghsp(data.totalPaidGhs)}</span>],
        ["Status", <StatusBadge key="status" status={data.status.toUpperCase()} />],
      ] as ([string, React.ReactNode] | null)[]).filter((row): row is [string, React.ReactNode] => row !== null)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink-50)" }}>
      <VendorFlowBar />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 40px" }}>

        <div style={{
          padding: 24, borderRadius: 20,
          background: "linear-gradient(160deg, var(--brand-500) 0%, var(--ink-200) 100%)",
          color: "white", boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "rgba(255,255,255,0.18)",
            display: "grid", placeItems: "center",
          }}>
            <Icon name="check" size={26} />
          </div>
          <h2 className="bh-display" style={{ fontSize: 28, margin: "16px 0 6px", letterSpacing: "-0.02em" }}>
            Order placed.
          </h2>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Your data will be processed and delivered shortly.</p>
        </div>

        <div className="bh-card" style={{ marginTop: 20, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-500)", letterSpacing: 0.5 }}>
            Order reference
          </div>
          <div className="bh-display" style={{ fontSize: 44, letterSpacing: "0.05em", margin: "8px 0", color: "var(--ink-900)", fontVariantNumeric: "tabular-nums" }}>
            {ref || "—"}
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={copyRef} disabled={!ref}>
            <Icon name="copy" size={14} /> Copy reference
          </Button>
          <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 14, lineHeight: 1.5 }}>
            Save this. You&apos;ll need it to check status later.
          </div>
        </div>

        <div className="bh-card" style={{ marginTop: 16, padding: 18 }}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--ink-100)" : "none",
              }}>
                <div style={{ height: 14, width: 80, borderRadius: 6, background: "var(--ink-100)" }} className="animate-pulse" />
                <div style={{ height: 14, width: 100, borderRadius: 6, background: "var(--ink-100)" }} className="animate-pulse" />
              </div>
            ))
          ) : (
            rows.map(([k, v], i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--ink-100)" : "none",
              }}>
                <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          {ref ? (
            <Button asChild className="rounded-full h-12 text-base">
              <Link href={`/order-status/${ref}`}>
                Track this order <Icon name="arrow-right" size={16} />
              </Link>
            </Button>
          ) : (
            <Button disabled className="rounded-full h-12 text-base">
              Track this order
            </Button>
          )}
          <Button asChild variant="ghost" className="rounded-full h-12 text-base">
            <Link href="/">Buy another bundle</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
