# Concurrency & Flow Fixes

Findings from codex audit + code review. Ordered by priority.

---

## 1. Order reference length regression (my fault — fix first)

**Files:** `src/app/order-status/page.tsx`

**Problem:** Prefixing refs with `OR`/`WL` made them 8 chars. The order-status lookup
page has `maxLength={6}`, validates `/^[0-9A-Za-z]{6}$/`, and shows "6-character"
messaging everywhere. New orders are unlookable via the status page. Old 6-char orders
still exist in the DB so the fix must accept both lengths.

**Fix:** Update regex to `/^[0-9A-Za-z]{6,8}$/`, `maxLength={8}`, update placeholder
and error copy to "6–8 characters".

---

## 2. Duplicate bundle fulfillment

**Files:** `src/app/api/v1/admin/orders/[id]/complete/route.ts`,
`src/lib/auto-send.ts`, `src/lib/models/order.ts`

**Problem:** Both the admin complete route and auto-send do:
1. Read order where `status: "paid"`
2. Call Jaybart (`sendBundle`)
3. Mark order `completed`

Two concurrent requests both pass step 1 before either completes step 3.
Jaybart is called twice. Customer receives the bundle twice.

**Fix:** Add `"fulfilling"` to the Order status enum. Before calling Jaybart,
atomically transition `paid` → `fulfilling` via `findOneAndUpdate`. If the update
returns null, another request already claimed it — return early. On Jaybart
success mark `completed`; on failure revert to `paid` so admin can retry.

```
// claim
const claimed = await OrderModel.findOneAndUpdate(
  { _id: orderId, status: "paid" },
  { status: "fulfilling" }
);
if (!claimed) return; // already claimed

// call Jaybart
// on success → completed
// on failure → revert to paid + store jaybartError
```

---

## 3. Vendor wallet purchase leaves orphaned paid order on ledger failure

**File:** `src/app/api/v1/orders/vendor/route.ts`

**Problem:** Current catch block:
```
} catch (err) {
  // refund wallet
  await UserModel.findByIdAndUpdate(vendorId, { $inc: { walletBalance: bundle.priceGhs } });
  throw err;
}
```
If `WalletTransactionModel.create` fails after `OrderModel.create` succeeds,
the order remains at `status: "paid"` with no ledger entry, and the wallet is
refunded. Vendor has a phantom paid order.

**Fix:** Also delete the order in the catch:
```
} catch (err) {
  await Promise.all([
    UserModel.findByIdAndUpdate(vendorId, { $inc: { walletBalance: bundle.priceGhs } }),
    order ? OrderModel.deleteOne({ _id: order._id }) : Promise.resolve(),
  ]);
  throw err;
}
```

---

## 4. Refund double-credit under concurrent admin requests

**File:** `src/app/api/v1/admin/orders/[id]/refund/route.ts`

**Problem:**
1. `findOne({ ..., refundedAt: null })` — both concurrent requests pass
2. `UserModel.findByIdAndUpdate({ $inc: walletBalance })` — both credit wallet
3. `OrderModel.findByIdAndUpdate(id, { refundedAt: new Date() })` — both stamp

Vendor is double-credited.

**Fix:** Stamp `refundedAt` atomically before touching the wallet:
```
const order = await OrderModel.findOneAndUpdate(
  { _id: id, status: "failed", paymentMethod: "wallet",
    placedBy: { $ne: null }, refundedAt: null },
  { refundedAt: new Date() },
  { new: false }
);
if (!order) return createErrorResponse("NotFound"); // already refunded or not found
// now credit wallet — safe, order is claimed
```

---

## 5. /pending bounces unauthenticated users to /login

**File:** `src/proxy.ts`

**Problem:** After a normal (non-auto-approve) signup the API returns success
without setting a session cookie. The signup page redirects to `/pending`.
The proxy checks `if (!s) return to(req, "/login")` for the `/pending` route,
so the vendor lands on the login page instead of the awaiting-approval page.

**Fix:** Allow `/pending` without a session. Change the proxy guard:
```
if (pathname === "/pending") {
  if (!s) return NextResponse.next();          // unauthenticated → show pending page
  if (s.role === "vendor" && s.status === "pending") return NextResponse.next();
  if (s.role === "admin") return to(req, "/admin/dashboard");
  return to(req, "/vendor/dashboard");         // approved vendor → go to dashboard
}
```

---

## 6. Admin wallet adjustment allows negative balance

**File:** `src/app/api/v1/admin/vendors/[id]/wallet-adjustment/route.ts`

**Problem:** `{ $inc: { walletBalance: amountGhs } }` with no lower bound.
A negative `amountGhs` can drive a vendor's balance below zero.
Intentional negative corrections are valid, but going below zero is not.

**Fix:** For negative adjustments, add `walletBalance: { $gte: -amountGhs }`
to the query filter so MongoDB rejects the update if it would go negative.

---

## Out of scope (noted, not fixing)

- **Stale JWT role/status** — 7-day tokens without revocation. Fixing requires
  short-lived tokens + refresh rotation. APIs are the real enforcement boundary.
- **Proxy JWT without signature verification** — Routing layer only; all data
  APIs verify the signature. Spoofed JWT gets you to a page, not through the API.

---

## Files touched

| File | Change |
|------|--------|
| `src/app/order-status/page.tsx` | Accept 6–8 char refs |
| `src/lib/models/order.ts` | Add `fulfilling` to status enum |
| `src/app/api/v1/admin/orders/[id]/complete/route.ts` | Atomic claim before Jaybart |
| `src/lib/auto-send.ts` | Atomic claim before Jaybart |
| `src/app/api/v1/orders/vendor/route.ts` | Delete order in catch |
| `src/app/api/v1/admin/orders/[id]/refund/route.ts` | Atomic refundedAt stamp |
| `src/proxy.ts` | Allow /pending without session |
| `src/app/api/v1/admin/vendors/[id]/wallet-adjustment/route.ts` | Negative balance guard |
