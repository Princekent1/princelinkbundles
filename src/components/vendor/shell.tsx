"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { ghsp } from "@/lib/data";
import { logout } from "@/api";
import { useAuthStore } from "@/stores/auth";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/vendor/dashboard" },
  { id: "orders",    label: "Orders",    icon: "list",      href: "/vendor/orders" },
  { id: "wallet",    label: "Wallet",    icon: "wallet",    href: "/vendor/wallet" },
  { id: "settings",  label: "Settings",  icon: "settings",  href: "/vendor/settings" },
];

interface VendorShellProps {
  children: React.ReactNode;
  walletBalance?: number;
  vendorName?: string;
  vendorEmail?: string;
}

export function VendorShell({
  children,
  walletBalance = 0,
  vendorName = "",
  vendorEmail = "",
}: VendorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = vendorName || "Vendor";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "V";

  const handleLogout = async () => {
    await logout.fn();
    clearUser();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--ink-50)]">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-40 w-[240px] bg-[var(--ink-50)]
          border-r border-[var(--ink-200)] flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          md:sticky md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ padding: "20px 14px" }}
      >
        <div className="flex items-start justify-between" style={{ padding: "0 6px 16px" }}>
          <div>
            <Wordmark small />
            <div style={{
              fontSize: 11, color: "var(--ink-500)", marginTop: 2,
              marginLeft: 38, fontWeight: 600, letterSpacing: 0.5,
              textTransform: "uppercase",
            }}>Vendor</div>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg text-[var(--ink-500)] bg-transparent border-none cursor-pointer"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  background: active ? "var(--ink-900)" : "transparent",
                  color: active ? "white" : "var(--ink-700)",
                  textDecoration: "none", fontSize: 14, fontWeight: 600,
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{
          margin: "16px 0", padding: 14,
          background: "linear-gradient(135deg, var(--brand-500) 0%, var(--ink-900) 100%)",
          borderRadius: 14, color: "white",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}>Wallet balance</div>
          <div className="bh-display" style={{ fontSize: 22, letterSpacing: "-0.02em", marginTop: 4 }}>
            {ghsp(walletBalance)}
          </div>
          <Link href="/vendor/wallet" onClick={() => setMobileOpen(false)} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 10, fontSize: 12, fontWeight: 600,
            color: "rgba(255,255,255,0.85)", textDecoration: "none",
          }}>
            Top up <Icon name="arrow-right" size={12} />
          </Link>
        </div>

        <a
          href="https://chat.whatsapp.com/KC7CFZlNjR79JerZooYG1N"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            margin: "12px 0", padding: "10px 12px",
            borderRadius: 10, textDecoration: "none",
            background: "var(--ink-50)", color: "var(--ink-700)",
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Icon name="whatsapp" size={16} />
          <span style={{ flex: 1 }}>Join community</span>
          <Icon name="ext" size={12} />
        </a>

        <div style={{ padding: 12, borderTop: "1px solid var(--ink-200)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--brand-500)", color: "white",
              display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vendorEmail}
              </div>
            </div>
            <button onClick={handleLogout} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: 6, borderRadius: 8, color: "var(--ink-500)",
              flexShrink: 0, background: "transparent", border: "none", cursor: "pointer",
            }} title="Sign out">
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-[var(--ink-50)] border-b border-[var(--ink-200)] flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-[var(--ink-700)] bg-transparent border-none cursor-pointer"
          >
            <Icon name="menu" size={20} />
          </button>
          <Wordmark small />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
