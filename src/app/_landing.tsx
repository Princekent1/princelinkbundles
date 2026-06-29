"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { logout, getPublicSettings } from "@/api";
import { useQuery } from "@tanstack/react-query";
import type { TokenPayload } from "@/lib/jwt";

const ease = [0.22, 1, 0.36, 1] as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease },
  };
}

function QuickBuyWidget() {
  const tabs = ["MTN", "Telecel", "AirtelTigo"];
  const bundles = [
    { vol: "1 GB",  days: "24 hours", price: "GHS 5",  popular: false },
    { vol: "5 GB",  days: "7 days",   price: "GHS 28", popular: true  },
    { vol: "10 GB", days: "30 days",  price: "GHS 55", popular: false },
  ];

  return (
    <div className="relative flex justify-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "rgba(0,229,255,0.12)", filter: "blur(100px)" }}
      />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-xl p-8 shadow-2xl"
        style={{ background: "#0f172a", border: "1px solid rgba(71,85,105,0.8)" }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-bold text-lg text-white">Prince K Ventures</h3>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Pick a bundle below</p>
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00e5ff", boxShadow: "0 0 6px rgba(0,229,255,0.8)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#334155" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#334155" }} />
          </div>
        </div>

        <div className="flex mb-6" style={{ borderBottom: "1px solid rgba(71,85,105,0.8)" }}>
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className="flex-1 pb-4 text-sm font-bold transition-colors"
              style={i === 0
                ? { borderBottom: "2px solid #00e5ff", color: "#00e5ff" }
                : { color: "#94a3b8" }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          {bundles.map((b) => (
            <div
              key={b.vol}
              className="flex justify-between items-center p-4 rounded-lg cursor-pointer transition-all"
              style={b.popular
                ? { border: "2px solid #3b82f6", background: "rgba(29,78,216,0.15)", boxShadow: "inset 0 0 20px rgba(59,130,246,0.1)" }
                : { border: "1px solid rgba(71,85,105,0.8)", background: "rgba(30,41,59,0.5)" }}
            >
              <div>
                <p className="font-bold text-lg text-white">{b.vol}</p>
                <p className="text-xs" style={{ color: b.popular ? "#bfdbfe" : "#94a3b8" }}>{b.days}</p>
              </div>
              <div className="text-right">
                {b.popular && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider block mb-1"
                    style={{ background: "#2563eb", color: "white" }}
                  >
                    Popular
                  </span>
                )}
                <p className="font-bold" style={{ color: b.popular ? "#00e5ff" : "white" }}>{b.price}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="w-full py-4 font-bold text-sm text-white rounded-lg flex justify-center items-center transition-all"
          style={{ background: "#2563eb", boxShadow: "0 0 15px rgba(37,99,235,0.5)" }}
        >
          Buy 5 GB · GHS 28 →
        </button>
      </div>
    </div>
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

  const { data: publicSettings } = useQuery({
    queryKey: getPublicSettings.key,
    queryFn: getPublicSettings.fn,
    staleTime: 5 * 60_000,
  });
  const contactPhone = publicSettings?.contactPhone ?? "";

  return (
    <div className="min-h-screen" style={{ background: "#0b1121", color: "#94a3b8", fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        .pk-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .pk-text-gradient {
          background: linear-gradient(to right, #60a5fa, #00e5ff, #5eead4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Nav */}
      <nav
        className="w-full h-20 flex items-center sticky top-0 z-50"
        style={{ background: "rgba(11,17,33,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(30,41,59,1)" }}
      >
        <div className="flex justify-between items-center w-full max-w-[1200px] mx-auto px-10">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <Image src="/logo-lockup.png" alt="Prince K Ventures" height={32} width={135} priority style={{ objectFit: "contain", objectPosition: "left center" }} />
          </Link>

          <div className="flex items-center gap-1.5">
            <Button
              asChild
              variant="ghost"
              className="hidden sm:inline-flex rounded-lg text-sm font-semibold"
              style={{ color: "#cbd5e1" }}
            >
              <Link href="/order-status">Check order</Link>
            </Button>
            {user ? (
              <>
                <Button
                  asChild
                  className="rounded-lg text-sm font-semibold text-white"
                  style={{ background: "#1e293b", border: "1px solid rgba(71,85,105,0.8)" }}
                >
                  <Link href={dashboardHref}>Dashboard</Link>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="rounded-lg text-sm font-semibold"
                  style={{ color: "#94a3b8" }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  className="rounded-lg text-sm font-semibold text-white"
                  style={{ background: "#1e293b", border: "1px solid rgba(71,85,105,0.8)" }}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex rounded-lg text-xs font-semibold"
                  style={{ color: "#64748b" }}
                >
                  <Link href="/admin/login">Admin</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 relative overflow-hidden" style={{ background: "#0b1121" }}>
        <div className="pk-grid absolute inset-0" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "rgba(37,99,235,0.18)", filter: "blur(120px)" }}
        />

        <div className="max-w-[1200px] mx-auto px-10 flex flex-col items-center text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <div
              className="inline-flex items-center px-3 py-1 rounded-full mb-8"
              style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,1)" }}
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.8)" }}
              />
              <span className="text-xs font-semibold tracking-wide" style={{ color: "#e2e8f0" }}>
                Ghana · MTN · Telecel · AirtelTigo
              </span>
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-6xl lg:text-7xl mb-8 font-bold text-white leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Data bundles,<br />
            <span className="pk-text-gradient">without the wahala.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.22)}
            className="text-lg max-w-lg mb-12 leading-relaxed"
            style={{ color: "#94a3b8" }}
          >
            Buy MTN, Telecel and AirtelTigo bundles for any number in Ghana. No account. No app.
            Just your phone and a 60-second checkout.
          </motion.p>

          <motion.div {...fadeUp(0.32)} className="flex flex-wrap gap-4 mb-12 justify-center">
            <Button
              asChild
              className="rounded-lg px-8 py-4 h-auto text-sm font-semibold flex items-center gap-2 text-white transition-all"
              style={{ background: "#2563eb", boxShadow: "0 0 20px rgba(37,99,235,0.4)" }}
            >
              <Link href="/networks">
                Buy a bundle <Icon name="arrow-right" size={17} />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="rounded-lg px-8 py-4 h-auto text-sm font-semibold text-white transition-all"
              style={{ border: "1px solid rgba(71,85,105,1)", background: "rgba(15,23,42,0.5)" }}
            >
              <Link href="/order-status">Check order status</Link>
            </Button>
          </motion.div>

          <motion.div {...fadeUp(0.44)} className="flex flex-wrap gap-8 justify-center">
            {[
              { icon: "bolt",   value: "< 5 min",   label: "Avg. delivery",   href: null },
              { icon: "shield", value: "Paystack",   label: "Secure checkout", href: null },
              ...(contactPhone ? [{ icon: "phone", value: contactPhone, label: "Call or WhatsApp", href: `tel:${contactPhone.replace(/\s/g, "")}` }] : []),
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#00e5ff" }}>
                  <Icon name={s.icon} size={20} />
                </span>
                <div className="text-xs text-left">
                  {s.href ? (
                    <a href={s.href} className="font-bold text-white block no-underline" style={{ lineHeight: 1.3 }}>
                      {s.value}
                    </a>
                  ) : (
                    <p className="font-bold text-white" style={{ lineHeight: 1.3 }}>{s.value}</p>
                  )}
                  <p>{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Buy Widget */}
      <section className="py-12 relative" style={{ background: "#0b1121" }}>
        <div className="pk-grid absolute inset-0" style={{ opacity: 0.5 }} />
        <div className="max-w-[1200px] mx-auto px-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <QuickBuyWidget />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24" style={{ background: "#0f172a", borderTop: "1px solid rgba(30,41,59,1)" }}>
        <div className="max-w-[1200px] mx-auto px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease }}
            className="mb-16"
          >
            <p className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "#00e5ff" }}>
              How it works
            </p>
            <h2
              className="text-4xl lg:text-5xl text-white font-bold tracking-tight"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Four steps. Sixty seconds.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { n: "01", t: "Pick a network",  d: "MTN, Telecel or AirtelTigo." },
              { n: "02", t: "Choose a bundle", d: "1 GB to 20 GB — any size."   },
              { n: "03", t: "Pay with MoMo",   d: "Secure Paystack checkout."   },
              { n: "04", t: "Get data fast",   d: "Bundle lands in minutes."    },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="space-y-4"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center font-bold"
                  style={{ background: "#1e293b", color: "#00e5ff", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08)" }}
                >
                  {s.n}
                </div>
                <div>
                  <p
                    className="font-bold text-white mb-1"
                    style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                  >
                    {s.t}
                  </p>
                  <p className="text-sm" style={{ color: "#64748b" }}>{s.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12" style={{ background: "#0b1121", borderTop: "1px solid rgba(30,41,59,1)" }}>
        <div className="max-w-[1200px] mx-auto px-10 flex flex-col sm:flex-row justify-between items-center gap-8">
          <p className="text-xs" style={{ color: "#475569" }}>
            © 2026 Prince K Ventures. All rights reserved. Accra, Ghana.
          </p>
          <nav className="flex flex-wrap justify-center gap-6 text-xs" style={{ color: "#94a3b8" }}>
            <Link href="/terms" className="no-underline transition-colors hover:text-white">Terms & Conditions</Link>
            <Link href="/privacy" className="no-underline transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/refund-policy" className="no-underline transition-colors hover:text-white">Refund Policy</Link>
            <Link href="/faq" className="no-underline transition-colors hover:text-white">FAQs</Link>
            <a
              href="mailto:support@princekventures.com"
              className="font-bold no-underline transition-colors hover:text-white"
              style={{ color: "#cbd5e1" }}
            >
              support@princekventures.com
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
