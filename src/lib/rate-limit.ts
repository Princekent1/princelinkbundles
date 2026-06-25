import { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };

function createRateLimiter(max: number, windowMs: number) {
  const store = new Map<string, Entry>();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= max) return false;

      entry.count++;
      return true;
    },
  };
}

export const loginLimiter = createRateLimiter(5, 15 * 60 * 1000);
export const signupLimiter = createRateLimiter(3, 60 * 60 * 1000);
export const jaybartSyncLimiter = createRateLimiter(10, 60 * 1000);

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
