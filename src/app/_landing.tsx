"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { logout } from "@/api";
import type { TokenPayload } from "@/lib/jwt";

const ease = [0.22, 1, 0.36, 1] as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease },
  };
}

function PhoneMockup() {
  const tabs = [
    { label: "MTN", color: "#F5B800", bg: "#FFF7E0" },
    { label: "Telecel", color: "#E5484D", bg: "#FFECEC" },
    { label: "AirtelTigo", color: "#1C4078", bg: "#E5EEFF" },
  ];

  const bundles = [
    { vol: "1 GB",  days: "24 hours", price: "GHS 7",  tag: null },
    { vol: "5 GB",  days: "7 days",   price: "GHS 28", tag: "Popular" },
    { vol: "10 GB", days: "30 days",  price: "GHS 55", tag: null },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease }}
      style={{
        animation: "phonefloat 5s ease-in-out infinite",
      }}
    >
      <div style={{
        width: 270,
        borderRadius: 40,
        background: "#ffffff",
        boxShadow: "0 60px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
        overflow: "hidden",
        userSelect: "none",
      }}>
        {/* Notch bar */}
        <div style={{ background: "#F5F5F4", padding: "12px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1C1917", fontFamily: "var(--font-space-grotesk), sans-serif" }}>9:41</span>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {[4, 3, 2].map(h => (
              <div key={h} style={{ width: 3, height: h * 2, background: "#1C1917", borderRadius: 1, opacity: 0.7 }} />
            ))}
            <div style={{ marginLeft: 4, width: 15, height: 8, border: "1.5px solid #44403C", borderRadius: 2.5, display: "flex", alignItems: "center", padding: "0 1.5px" }}>
              <div style={{ height: 5, width: "75%", background: "#16A34A", borderRadius: 1 }} />
              <div style={{ position: "absolute", right: -3, width: 2, height: 5, background: "#44403C", borderRadius: "0 1px 1px 0" }} />
            </div>
          </div>
        </div>

        {/* App header */}
        <div style={{ padding: "10px 18px 10px", background: "#F5F5F4", borderBottom: "1px solid #E7E5E4" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.03em", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            Prince K Ventures
          </div>
          <div style={{ fontSize: 10, color: "#78716C", marginTop: 2 }}>Pick a bundle below</div>
        </div>

        {/* Network tabs */}
        <div style={{ display: "flex", gap: 5, padding: "10px 14px 6px", background: "white" }}>
          {tabs.map((t, i) => (
            <div key={t.label} style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 10,
              textAlign: "center",
              fontSize: 9,
              fontWeight: 700,
              background: i === 0 ? t.bg : "transparent",
              color: i === 0 ? t.color : "#A8A29E",
              border: `1.5px solid ${i === 0 ? t.color + "50" : "transparent"}`,
              transition: "all 0.2s",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              letterSpacing: "0.01em",
            }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Bundle list */}
        <div style={{ padding: "4px 14px 10px", display: "flex", flexDirection: "column", gap: 7, background: "white" }}>
          {bundles.map((b, i) => (
            <div key={b.vol} style={{
              padding: "11px 13px",
              borderRadius: 14,
              border: `1.5px solid ${i === 1 ? "#16A34A35" : "#E7E5E4"}`,
              background: i === 1 ? "#F0FDF4" : "#FAFAF9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1C1917", fontFamily: "var(--font-space-grotesk), sans-serif", letterSpacing: "-0.02em" }}>{b.vol}</div>
                <div style={{ fontSize: 10, color: "#78716C", marginTop: 1 }}>{b.days}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {b.tag && (
                  <div style={{ fontSize: 8, background: "#16A34A", color: "white", borderRadius: 5, padding: "2px 5px", marginBottom: 3, fontWeight: 700, display: "inline-block" }}>
                    {b.tag}
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1C1917", fontFamily: "var(--font-space-grotesk), sans-serif" }}>{b.price}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: "2px 14px 18px", background: "white" }}>
          <div style={{
            background: "#16A34A",
            color: "white",
            borderRadius: 14,
            padding: "12px",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-space-grotesk), sans-serif",
            letterSpacing: "-0.01em",
          }}>
            Buy 5 GB · GHS 28 →
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingPage({ user }: { user: TokenPayload | null }) {
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  async function handleLogout() {
    await logout.fn();
    clearUser();
    router.push("/login");
  }

  const dashboardHref = user?.role === "admin" ? "/admin/dashboard" : "/vendor/dashboard";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        @keyframes phonefloat {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50%       { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes blobpulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>

      {/* Nav */}
      <nav className="px-4 sm:px-8 lg:px-16 py-4 lg:py-5 flex items-center justify-between border-b border-[var(--ink-100)] bg-white">
        <Wordmark />
        <div className="flex gap-1.5 items-center">
          <Button asChild variant="ghost" className="hidden sm:inline-flex rounded-full text-sm font-semibold text-[var(--ink-700)]">
            <Link href="/order-status">Check order</Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="outline" className="rounded-full text-sm font-semibold">
                <Link href={dashboardHref}>Dashboard</Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="rounded-full text-sm font-semibold text-[var(--ink-500)]">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="rounded-full text-sm font-semibold">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="ghost" className="hidden md:inline-flex rounded-full text-xs font-semibold text-[var(--ink-400)]">
                <Link href="/admin/login">Admin</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 sm:px-8 lg:px-16 pt-14 lg:pt-20 pb-16 lg:pb-24"
        style={{ background: "var(--ink-900)" }}
      >
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div style={{
            position: "absolute",
            top: "-15%",
            right: "-8%",
            width: 580,
            height: 580,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(22,163,74,0.22) 0%, transparent 68%)",
            animation: "blobpulse 8s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute",
            bottom: "-25%",
            left: "-12%",
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(247,184,54,0.18) 0%, transparent 65%)",
            animation: "blobpulse 11s ease-in-out infinite reverse",
          }} />
          <div style={{
            position: "absolute",
            top: "40%",
            left: "45%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)",
          }} />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center max-w-[1100px]">

          {/* Left — text */}
          <div className="max-w-[580px]">
            <motion.div {...fadeUp(0)}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(22,163,74,0.15)",
                border: "1px solid rgba(22,163,74,0.3)",
                borderRadius: 999,
                padding: "5px 12px 5px 8px",
                marginBottom: 24,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F7B836", display: "inline-block", boxShadow: "0 0 6px #F7B836" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#4ADE80", letterSpacing: "0.02em" }}>Ghana · MTN · Telecel · AirtelTigo</span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.1)}
              className="bh-display my-0"
              style={{ fontSize: "clamp(44px, 7vw, 76px)", lineHeight: 0.97, letterSpacing: "-0.04em", color: "white" }}
            >
              Data bundles,<br />
              <span style={{ color: "var(--bh-accent-500)" }}>without the wahala.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.22)}
              style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--ink-400)", lineHeight: 1.65, maxWidth: 500, marginTop: 20, marginBottom: 0 }}
            >
              Buy MTN, Telecel and AirtelTigo bundles for any number in Ghana. No account. No app.
              Just your phone and a 60-second checkout.
            </motion.p>

            <motion.div {...fadeUp(0.32)} className="flex flex-wrap gap-3 mt-8">
              <Button
                asChild
                className="rounded-full px-6 py-3.5 h-auto text-[15px] font-semibold gap-2"
                style={{ background: "var(--brand-500)", color: "white" }}
              >
                <Link href="/networks">
                  Buy a bundle <Icon name="arrow-right" size={17} />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-full px-6 py-3.5 h-auto text-[15px] font-semibold gap-2"
                style={{ color: "var(--ink-300)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Link href="/order-status">Check order status</Link>
              </Button>
            </motion.div>

            <motion.div {...fadeUp(0.44)} className="flex flex-wrap gap-x-6 gap-y-3 mt-9">
              {[
                { icon: "bolt",   value: "< 5 min",    label: "Avg. delivery" },
                { icon: "shield", value: "Paystack",    label: "Secure checkout" },
                { icon: "phone",  value: "+233 54 842 6310", label: "Call or WhatsApp" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "rgba(22,163,74,0.12)",
                    border: "1px solid rgba(22,163,74,0.2)",
                    display: "grid", placeItems: "center",
                    color: "#4ADE80", flexShrink: 0,
                  }}>
                    <Icon name={s.icon} size={16} />
                  </span>
                  <div>
                    {s.icon === "phone" ? (
                      <a
                        href="tel:+233548426310"
                        style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1.2, textDecoration: "none", display: "block" }}
                      >
                        {s.value}
                      </a>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1.2 }}>{s.value}</div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 1 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — phone */}
          <div className="hidden lg:flex items-center justify-center">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-8 lg:px-16 py-12 lg:py-16 border-t border-[var(--ink-100)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease }}
          className="mb-8 lg:mb-10"
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-500)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            How it works
          </div>
          <h2 className="bh-display" style={{ fontSize: "clamp(24px, 4vw, 36px)", letterSpacing: "-0.03em", margin: 0, color: "var(--ink-900)" }}>
            Four steps. Sixty seconds.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 relative">
          {/* Connecting line — desktop */}
          <div className="hidden md:block absolute top-[22px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px" style={{ background: "linear-gradient(to right, var(--brand-100), var(--brand-200), var(--brand-100))" }} />

          {[
            { n: "01", t: "Pick a network",  d: "MTN, Telecel or AirtelTigo." },
            { n: "02", t: "Choose a bundle", d: "1 GB to 20 GB — any size."  },
            { n: "03", t: "Pay with MoMo",   d: "Secure Paystack checkout."  },
            { n: "04", t: "Get data fast",   d: "Bundle lands in minutes."   },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "var(--brand-50)",
                border: "1.5px solid var(--brand-100)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12, position: "relative", zIndex: 1,
              }}>
                <span className="bh-display" style={{ fontSize: 13, color: "var(--brand-600)", letterSpacing: "-0.02em" }}>{s.n}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-900)", marginBottom: 4 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.5 }}>{s.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 lg:px-16 pt-6 pb-8 border-t border-[var(--ink-100)] text-[var(--ink-500)] text-[13px] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <span>© 2026 Prince K Ventures. Accra, Ghana.</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/terms" className="hover:text-[var(--ink-800)] no-underline transition-colors">Terms & Conditions</Link>
          <Link href="/privacy" className="hover:text-[var(--ink-800)] no-underline transition-colors">Privacy Policy</Link>
          <Link href="/refund-policy" className="hover:text-[var(--ink-800)] no-underline transition-colors">Refund Policy</Link>
          <Link href="/faq" className="hover:text-[var(--ink-800)] no-underline transition-colors">FAQs</Link>
          <a href="mailto:support@princekventures.com" className="text-[var(--ink-700)] font-semibold no-underline hover:text-[var(--ink-900)] transition-colors">support@princekventures.com</a>
        </nav>
      </footer>
    </div>
  );
}
