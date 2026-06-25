"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VendorFlowBar } from "@/components/ui/vendor-flow-bar";
import { NetChip } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";

type OrderLookup = {
  reference: string;
  status: string;
  networkSnapshot: string;
  bundleNameSnapshot: string;
  validityDays: number | null;
  customerPhone: string;
  amountGhs: number;
  processingFeeGhs: number;
  totalPaidGhs: number;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
};

const PHASES = ["Payment", "Processing", "Completed"];

function isPhaseDone(status: string, idx: number) {
  if (idx === 0) return status === "paid" || status === "fulfilling" || status === "completed";
  if (idx === 1) return status === "completed";
  return status === "completed";
}

function isPhaseActive(status: string, idx: number) {
  if (idx === 0) return status === "pending_payment";
  if (idx === 1) return status === "paid" || status === "fulfilling";
  return status === "completed";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function paymentLabel(method: string) {
  return method === "wallet" ? "Wallet" : "Paystack";
}

function phaseSubtitle(phase: string, idx: number, order: OrderLookup) {
  const done = isPhaseDone(order.status, idx);
  const active = isPhaseActive(order.status, idx);
  if (phase === "Payment") {
    if (done && order.paidAt) return `${formatTime(order.paidAt)} — ${paymentLabel(order.paymentMethod)} confirmed`;
    if (done) return "Payment confirmed";
    return "Awaiting payment";
  }
  if (phase === "Processing") {
    if (active) return "We're sending your data now.";
    if (done) return "Data sent.";
    return "Up next.";
  }
  if (phase === "Completed") {
    if (done) return "Bundle delivered.";
    return "Usually within 5 min.";
  }
  return "";
}

function formatValidity(days: number | null) {
  if (!days) return null;
  return days === 1 ? "24 hours" : `${days} days`;
}

function formatAmount(pesewas: number) {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

export default function OrderStatusResultPage() {
  const { ref } = useParams();
  const orderRef = String(ref);

  const [order, setOrder] = useState<OrderLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/orders/lookup?ref=${encodeURIComponent(orderRef)}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error();
        const data: OrderLookup = await res.json();
        setOrder(data);

        if (data.status === "fulfilling" || data.status === "failed") {
          fetch(`/api/v1/orders/sync?ref=${encodeURIComponent(orderRef)}`, { method: "POST" })
            .then(r => r.ok ? r.json() : null)
            .then((result: { status: string } | null) => {
              if (result && result.status !== data.status) {
                setOrder(prev => prev ? { ...prev, status: result.status } : null);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderRef]);

  const isFailed = order?.status === "failed" || order?.status === "cancelled";

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <VendorFlowBar />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 40px" }}>
        <Button asChild variant="ghost" size="sm" className="px-0 gap-1.5">
          <Link href="/order-status">
            <Icon name="arrow-left" size={16} /> Home
          </Link>
        </Button>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Reference</div>
          <div className="bh-display" style={{ fontSize: 40, letterSpacing: "0.05em", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {orderRef}
          </div>
        </div>

        {loading && (
          <div style={{ marginTop: 20, padding: 20, background: "white", borderRadius: 16, border: "1px solid var(--ink-200)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[80, 60, 70].map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ink-100)", flexShrink: 0 }} />
                  <div style={{ height: 14, width: `${w}%`, borderRadius: 6, background: "var(--ink-100)" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && notFound && (
          <div style={{ marginTop: 20, padding: 20, background: "white", borderRadius: 16, border: "1px solid var(--ink-200)", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-900)" }}>Order not found</div>
            <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>
              Double-check the reference and try again.
            </div>
          </div>
        )}

        {!loading && order && isFailed && (
          <div style={{ marginTop: 20, padding: 20, background: "white", borderRadius: 16, border: "1px solid var(--ink-200)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "var(--error-bg, #FEF2F2)", border: "2px solid var(--error, #EF4444)",
                display: "grid", placeItems: "center",
              }}>
                <Icon name="x" size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-900)", textTransform: "capitalize" }}>{order.status}</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
                  {order.status === "cancelled" ? "This order was cancelled." : "This order could not be fulfilled."}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && order && !isFailed && (
          <div style={{
            marginTop: 20, padding: 20, background: "white",
            borderRadius: 16, border: "1px solid var(--ink-200)",
          }}>
            {PHASES.map((phase, i) => {
              const done = isPhaseDone(order.status, i);
              const active = isPhaseActive(order.status, i);
              return (
                <div key={phase} style={{ display: "flex", gap: 14, paddingBottom: i < 2 ? 14 : 0, position: "relative" }}>
                  {i < 2 && (
                    <div style={{
                      position: "absolute", left: 13, top: 28, bottom: -2, width: 2,
                      background: isPhaseDone(order.status, i + 1) ? "var(--ok)" : "var(--ink-200)",
                    }} />
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: done ? "var(--ok)" : "white",
                    border: done ? "none" : "2px solid var(--ink-300)",
                    display: "grid", placeItems: "center", color: "white",
                    boxShadow: active ? "0 0 0 6px var(--ok-bg)" : "none",
                  }}>
                    {done && <Icon name="check" size={16} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: done ? "var(--ink-900)" : "var(--ink-500)" }}>{phase}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
                      {phaseSubtitle(phase, i, order)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && order && (
          <div className="bh-card" style={{ marginTop: 16, padding: 18 }}>
            {([
              ["Bundle", `${order.bundleNameSnapshot}${formatValidity(order.validityDays) ? ` — ${formatValidity(order.validityDays)}` : ""}`],
              ["Network", <NetChip key="net" network={order.networkSnapshot.toUpperCase()} />],
              ["Phone", order.customerPhone],
              ["Bundle amount", <span key="amt" className="bh-mono">{formatAmount(order.amountGhs)}</span>],
              order.processingFeeGhs > 0 ? ["Paystack fee", <span key="fee" className="bh-mono">{formatAmount(order.processingFeeGhs)}</span>] : null,
              ["Amount paid", <span key="total" className="bh-mono">{formatAmount(order.totalPaidGhs)}</span>],
            ] as ([string, React.ReactNode] | null)[])
              .filter((row): row is [string, React.ReactNode] => row !== null)
              .map(([k, v], i, a) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: i < a.length - 1 ? "1px solid var(--ink-100)" : "none",
              }}>
                <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" className="w-full mt-4 rounded-full h-12 text-base">
          <Link href="/">Buy another bundle</Link>
        </Button>
      </div>
    </div>
  );
}
