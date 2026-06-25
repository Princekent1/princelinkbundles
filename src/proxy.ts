import { NextRequest, NextResponse } from "next/server";

type Session = { role: "admin" | "vendor"; status: string };

function getSession(req: NextRequest): Session | null {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    if (p.exp && p.exp < Date.now() / 1000) return null;
    if (!p.role) return null;
    return { role: p.role, status: p.status ?? "" };
  } catch {
    return null;
  }
}

function to(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = getSession(req);

  if (pathname === "/login" || pathname === "/signup") {
    if (!s) return NextResponse.next();
    if (s.role === "admin") return to(req, "/admin/dashboard");
    if (s.status === "pending") return to(req, "/pending");
    return to(req, "/vendor/dashboard");
  }

  if (pathname === "/pending") {
    if (!s) return NextResponse.next();
    if (s.role === "vendor" && s.status === "pending") return NextResponse.next();
    if (s.role === "admin") return to(req, "/admin/dashboard");
    return to(req, "/vendor/dashboard");
  }

  if (pathname.startsWith("/admin")) {
    if (!s) return to(req, "/login");
    if (s.role === "admin") return NextResponse.next();
    return s.status === "pending" ? to(req, "/pending") : to(req, "/vendor/dashboard");
  }

  if (pathname.startsWith("/vendor")) {
    if (!s) return to(req, "/login");
    if (s.role === "admin") return to(req, "/admin/dashboard");
    if (s.status !== "approved") return to(req, "/pending");
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/pending", "/admin/:path*", "/vendor/:path*"],
};
