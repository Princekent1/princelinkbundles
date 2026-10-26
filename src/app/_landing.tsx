"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { logout, getPublicSettings, getPublicAnnouncements, getBundles } from "@/api";
import { ghsp } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import type { TokenPayload } from "@/lib/jwt";
import { AnnouncementsCarousel } from "@/components/announcements-carousel";

const ease = [0.22, 1, 0.36, 1] as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease },
  };
}

const NETWORKS = [
  { id: "mtn",        label: "MTN" },
  { id: "telecel",    label: "Telecel" },
  { id: "airteltigo", label: "AirtelTigo" },
];

function QuickBuyWidget() {
  const router = useRouter();
  const [activeNetwork, setActiveNetwork] = useState("mtn");

  const { data, isLoading } = useQuery({
    queryKey: getBundles.key(activeNetwork),
    queryFn: () => getBundles.fn(activeNetwork),
    staleTime: 5 * 60_000,
  });

  const bundles = (data?.bundles ?? []).slice(0, 3);
  const networkLabel = NETWORKS.find(n => n.id === activeNetwork)?.label ?? "MTN";

  return (
    <div className="relative flex justify-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "var(--brand-100)", filter: "blur(100px)" }}
      />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-xl p-8"
        style={{ background: "var(--ink-100)", border: "1px solid var(--ink-200)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--ink-900)" }}>Prince K Ventures</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-500)" }}>Pick a bundle below</p>
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand-500)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-300)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-300)" }} />
          </div>
        </div>

        <div className="flex mb-6" style={{ borderBottom: "1px solid var(--ink-200)" }}>
          {NETWORKS.map(net => (
            <button
              key={net.id}
              onClick={() => setActiveNetwork(net.id)}
              className="flex-1 pb-4 text-sm font-bold transition-colors"
              style={activeNetwork === net.id
                ? { borderBottom: "2px solid var(--brand-500)", color: "var(--brand-500)" }
                : { color: "var(--ink-500)", cursor: "pointer" }}
            >
              {net.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg"
                  style={{ height: 64, background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}
                />
              ))
            : bundles.length === 0
            ? (
                <p className="text-center py-6 text-sm" style={{ color: "var(--ink-500)" }}>
                  No bundles available
                </p>
              )
            : bundles.map((b) => (
                <div
                  key={b._id}
                  className="flex justify-between items-center p-4 rounded-lg"
                  style={{ border: "1px solid var(--ink-200)", background: "var(--ink-50)" }}
                >
                  <div>
                    <p className="font-bold text-lg" style={{ color: "var(--ink-900)" }}>{b.name}</p>
                    <p className="text-xs" style={{ color: "var(--ink-500)" }}>{b.validity}</p>
                  </div>
                  <p className="font-bold" style={{ color: "var(--ink-900)" }}>{ghsp(b.priceGhs)}</p>
                </div>
              ))
          }
        </div>

        <button
          onClick={() => router.push(`/bundles/${activeNetwork}`)}
          className="w-full py-4 font-bold text-sm text-white rounded-lg flex justify-center items-center transition-all"
          style={{ background: "var(--brand-500)", boxShadow: "0 6px 16px rgba(37,99,235,0.25)", cursor: "pointer" }}
        >
          Buy {networkLabel} bundle →
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
    <div className="min-h-screen" style={{ background: "var(--ink-50)", color: "var(--ink-600)", fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        .pk-grid {
          background-image:
            linear-gradient(to right, rgba(90,70,40,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(90,70,40,0.06) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .pk-text-gradient {
          background: linear-gradient(to right, #1d4ed8, #3b82f6, #0e7490);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Nav */}
      <nav
        className="w-full h-20 flex items-center sticky top-0 z-50"
        style={{ background: "rgba(250,246,238,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--ink-200)" }}
      >
        <div className="flex justify-between items-center w-full max-w-[1200px] mx-auto px-10">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <Image src="/logo-lockup-light.png" alt="Prince K Ventures" height={32} width={135} priority style={{ objectFit: "contain", objectPosition: "left center" }} />
          </Link>

          <div className="flex items-center gap-1.5">
            <Button
              asChild
              variant="ghost"
              className="hidden sm:inline-flex rounded-lg text-sm font-semibold"
              style={{ color: "var(--ink-700)" }}
            >
              <Link href="/order-status">Check order</Link>
            </Button>
            {user ? (
              <>
                <Button
                  asChild
                  className="rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--brand-500)" }}
                >
                  <Link href={dashboardHref}>Dashboard</Link>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="rounded-lg text-sm font-semibold"
                  style={{ color: "var(--ink-500)" }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  className="rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--brand-500)" }}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex rounded-lg text-xs font-semibold"
                  style={{ color: "var(--ink-500)" }}
                >
                  <Link href="/admin/login">Admin</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 relative overflow-hidden" style={{ background: "var(--ink-50)" }}>
        <div className="pk-grid absolute inset-0" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "var(--brand-100)", filter: "blur(120px)" }}
        />

        <div className="max-w-[1200px] mx-auto px-10 flex flex-col items-center text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <div
              className="inline-flex items-center px-3 py-1 rounded-full mb-8"
              style={{ background: "var(--ink-100)", border: "1px solid var(--ink-200)" }}
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ background: "var(--ok)" }}
              />
              <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--ink-800)" }}>
                Ghana · MTN · Telecel · AirtelTigo
              </span>
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-6xl lg:text-7xl mb-8 font-bold leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif", color: "var(--ink-900)" }}
          >
            Data bundles,<br />
            <span className="pk-text-gradient">without the wahala.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.22)}
            className="text-lg max-w-lg mb-12 leading-relaxed"
            style={{ color: "var(--ink-600)" }}
          >
            Buy MTN, Telecel and AirtelTigo bundles for any number in Ghana. No account. No app.
            Just your phone and a 60-second checkout.
          </motion.p>

          <motion.div {...fadeUp(0.32)} className="flex flex-wrap gap-4 mb-12 justify-center">
            <Button
              asChild
              className="rounded-lg px-8 py-4 h-auto text-sm font-semibold flex items-center gap-2 text-white transition-all"
              style={{ background: "var(--brand-500)", boxShadow: "0 8px 20px rgba(37,99,235,0.25)" }}
            >
              <Link href="/networks">
                Buy a bundle <Icon name="arrow-right" size={17} />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="rounded-lg px-8 py-4 h-auto text-sm font-semibold transition-all"
              style={{ border: "1px solid var(--ink-300)", background: "var(--ink-100)", color: "var(--ink-800)" }}
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
              <div key={s.label} className="flex items-center gap-2" style={{ color: "var(--ink-600)" }}>
                <span style={{ color: "var(--brand-500)" }}>
                  <Icon name={s.icon} size={20} />
                </span>
                <div className="text-xs text-left">
                  {s.href ? (
                    <a href={s.href} className="font-bold block no-underline" style={{ lineHeight: 1.3, color: "var(--ink-900)" }}>
                      {s.value}
                    </a>
                  ) : (
                    <p className="font-bold" style={{ lineHeight: 1.3, color: "var(--ink-900)" }}>{s.value}</p>
                  )}
                  <p>{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Buy Widget */}
      <section className="py-12 relative" style={{ background: "var(--ink-50)" }}>
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
      <section className="py-24" style={{ background: "#f4eee1", borderTop: "1px solid var(--ink-200)" }}>
        <div className="max-w-[1200px] mx-auto px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease }}
            className="mb-16"
          >
            <p className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "var(--brand-500)" }}>
              How it works
            </p>
            <h2
              className="text-4xl lg:text-5xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif", color: "var(--ink-900)" }}
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
                  style={{ background: "var(--brand-100)", color: "var(--brand-500)" }}
                >
                  {s.n}
                </div>
                <div>
                  <p
                    className="font-bold mb-1"
                    style={{ fontFamily: "var(--font-space-grotesk), sans-serif", color: "var(--ink-900)" }}
                  >
                    {s.t}
                  </p>
                  <p className="text-sm" style={{ color: "var(--ink-500)" }}>{s.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12" style={{ background: "var(--ink-50)", borderTop: "1px solid var(--ink-200)" }}>
        <div className="max-w-[1200px] mx-auto px-10 flex flex-col sm:flex-row justify-between items-center gap-8">
          <p className="text-xs" style={{ color: "var(--ink-500)" }}>
            © 2026 Prince K Ventures. All rights reserved. Accra, Ghana.
          </p>
          <nav className="flex flex-wrap justify-center gap-6 text-xs" style={{ color: "var(--ink-600)" }}>
            <Link href="/terms" className="no-underline transition-colors hover:text-[var(--brand-500)]">Terms & Conditions</Link>
            <Link href="/privacy" className="no-underline transition-colors hover:text-[var(--brand-500)]">Privacy Policy</Link>
            <Link href="/refund-policy" className="no-underline transition-colors hover:text-[var(--brand-500)]">Refund Policy</Link>
            <Link href="/faq" className="no-underline transition-colors hover:text-[var(--brand-500)]">FAQs</Link>
            <a
              href="mailto:Princelinkbundles@gmail.com"
              className="font-bold no-underline transition-colors hover:text-[var(--brand-500)]"
              style={{ color: "var(--ink-800)" }}
            >
              Princelinkbundles@gmail.com
            </a>
          </nav>
        </div>
      </footer>

      <AnnouncementsCarousel
        queryKey={getPublicAnnouncements.key}
        queryFn={getPublicAnnouncements.fn}
      />
    </div>
  );
}
