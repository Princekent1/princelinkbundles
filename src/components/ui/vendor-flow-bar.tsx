"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api";
import { ghsp } from "@/lib/data";
import { Icon } from "@/components/ui/icons";

export function VendorFlowBar() {
  const { data } = useQuery({
    queryKey: getMe.key,
    queryFn: getMe.fn,
    retry: false,
  });

  const user = data?.user;
  if (!user || user.role !== "vendor" || user.status !== "approved") return null;

  return (
    <div className="sticky top-0 z-50 bg-[var(--brand-500)] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-[13px]">
      <span className="text-white/50 font-medium truncate mr-4">{user.businessName ?? user.email}</span>
      <div className="flex items-center gap-4 shrink-0">
        <span className="bh-mono font-semibold">{ghsp(user.walletBalance)}</span>
        <Link
          href="/vendor/dashboard"
          className="flex items-center gap-1.5 font-semibold text-white no-underline opacity-80 hover:opacity-100 transition-opacity"
        >
          Dashboard <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
}
