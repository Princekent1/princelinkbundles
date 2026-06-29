"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { logout, getAdminNavCounts } from "@/api";
import { useAuthStore } from "@/stores/auth";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/admin/dashboard" },
  { id: "orders",    label: "Orders",    icon: "list",      href: "/admin/orders",   countKey: "pendingOrders" as const },
  { id: "vendors",   label: "Vendors",   icon: "user",      href: "/admin/vendors",  countKey: "pendingVendors" as const },
  { id: "bundles",      label: "Bundles",      icon: "package", href: "/admin/bundles" },
  { id: "transactions", label: "Transactions", icon: "wallet",  href: "/admin/transactions" },
  { id: "settings",     label: "Settings",     icon: "settings", href: "/admin/settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: navCounts } = useQuery({
    queryKey: getAdminNavCounts.key,
    queryFn: getAdminNavCounts.fn,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const handleLogout = async () => {
    await logout.fn();
    clearUser();
    router.push("/login");
  };

  const displayName = user?.businessName ?? user?.email ?? "Admin";
  const initial = displayName[0].toUpperCase();

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
        <div className="flex items-start justify-between pb-4" style={{ padding: "0 6px 16px" }}>
          <div>
            <Wordmark small />
            <div style={{
              fontSize: 11, color: "var(--ink-500)", marginTop: 2,
              marginLeft: 38, fontWeight: 600, letterSpacing: 0.5,
              textTransform: "uppercase",
            }}>Admin</div>
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
            const badge = item.countKey ? navCounts?.[item.countKey] : undefined;
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge != null && badge > 0 && (
                  <span style={{
                    padding: "1px 8px", fontSize: 11, fontWeight: 700,
                    background: active ? "var(--brand-500)" : "var(--bh-accent-500)",
                    color: "white", borderRadius: 999,
                  }}>{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <a
          href="https://chat.whatsapp.com/KC7CFZlNjR79JerZooYG1N"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            margin: "auto 0 12px", padding: "10px 12px",
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
              display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
            }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email}
              </div>
            </div>
            <button onClick={handleLogout} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: 6, borderRadius: 8, color: "var(--ink-500)",
              background: "transparent", border: "none", cursor: "pointer",
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
