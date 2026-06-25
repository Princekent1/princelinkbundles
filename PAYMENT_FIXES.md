# Payment Flow Fixes

Findings from full Paystack + deposit flow audit. Ordered by severity.

---

## 1. Guest order reference can collide with "TP" prefix

**File:** `src/app/api/v1/orders/guest/route.ts`

**Problem:** The 6-char alphanumeric generator has no prefix restriction. A reference like
`TPabc1` has a ~1-in-3844 chance of starting with "TP". The webhook routes any reference
starting with "TP" to `handleTopupSuccess`, so that payment would be silently misrouted —
order never fulfilled, no error.

**Fix:** Prefix all guest order references with `OR` (e.g. `ORabc123`). This makes routing
unambiguous and eliminates the collision entirely. Update `generateReference()` in the guest
order route.

**Also affects:** Vendor wallet purchase orders in `src/app/api/v1/orders/vendor/route.ts` —
same generator, same risk. Prefix those with `WL` (e.g. `WLabc123`).

**Webhook change:** The routing condition `reference.startsWith("TP")` remains correct. Add
a check that non-TP references start with a known prefix, and log a warning otherwise.

---

## 2. Webhook exception swallows failure but still marks event processed

**File:** `src/app/api/v1/paystack/webhook/route.ts`

**Problem:** If `handleOrderSuccess` or `handleTopupSuccess` throws (DB down, Mongoose
error, etc.), the outer `catch` block swallows the error and execution falls through to
`PaymentEventModel.updateOne({ processed: true })`. The event is permanently marked done
even though nothing happened. Paystack won't retry (already got 200). Money in, no credit.

**Fix:** Only mark `processed: true` if the handler completed without throwing. Move the
`updateOne` inside a `try/finally` where the finally only runs on success, or restructure
so the flag is set before returning 200 but only after the handler resolves. Concretely:

```
try {
  await handleOrderSuccess / handleTopupSuccess
  await PaymentEventModel.updateOne({ processed: true })
} catch {
  // leave processed: false — event can be retried manually
}
return Response.json({ received: true })  // always 200 to Paystack
```

---

## 3. Wallet topup double-submit risk

**File:** `src/app/vendor/wallet/page.tsx` + `src/app/api/v1/vendor/wallet/topup/route.ts`

**Problem:** No guard prevents the vendor from clicking "Pay with Paystack" twice before the
redirect fires. Two `WalletTopup` records are created. If the vendor completes both Paystack
sessions, the second webhook call finds the first topup already `success` and returns early —
but that second payment is now untracked. Vendor paid twice, credited once, no refund path.

**Fix (two layers):**
- **Client:** Disable the submit button immediately on first click (set `isPending` state
  before the mutation resolves), re-enable only on error.
- **Server:** Before creating a new `WalletTopup`, check for an existing `pending` topup
  for the same vendor. If one exists and was created within the last 10 minutes, return its
  existing `paystackUrl` instead of creating a new record. Add a `expiresAt` field to
  `WalletTopupModel` (TTL of 30 minutes) to allow fresh sessions after expiry.

---

## 4. `charge.failed` not handled — topups stay pending forever

**File:** `src/app/api/v1/paystack/webhook/route.ts`

**Problem:** The webhook only handles `charge.success`. If a vendor's Paystack payment
fails or they cancel, the `WalletTopup` record stays `status: "pending"` indefinitely.
The `"failed"` enum value exists in the schema but is never written. No audit trail.
UI shows nothing to the vendor.

**Fix:**
- Add a `charge.failed` branch in the webhook alongside `charge.success`.
- `handleTopupFailed(reference)`: find topup by reference + status "pending", set
  `status: "failed"`. No wallet change.
- Also handle the cancel path: Paystack redirects to callback URL even on cancel
  (with a failed/abandoned status). The `?topup=success` detection already exists —
  add a `?topup=cancelled` path that shows the appropriate toast.

---

## 5. Admin verify doesn't trigger auto-send

**File:** `src/app/api/v1/admin/orders/[id]/verify/route.ts`

**Problem:** When admin manually verifies a Paystack payment (webhook missed), the order
moves from `pending_payment` → `paid` but `tryAutoSend` is never called. Admin must then
open the order and click "Mark as completed" as a second step, which they may not know to
do. Order sits paid but unfulfilled.

**Fix:** After successfully updating status to `paid`, populate the bundleId and call
`tryAutoSend`. Same pattern as the webhook. If auto-send is disabled, leave as paid —
admin will complete manually as before.

---

## 6. `Order.paystackReference` is never populated

**Files:** `src/app/api/v1/paystack/webhook/route.ts`,
`src/app/api/v1/admin/orders/[id]/verify/route.ts`

**Problem:** The field exists on the model and is shown in the admin detail UI (it always
renders null). Makes cross-referencing a Paystack transaction to an order impossible
without going through the reference column.

**Fix:** In `handleOrderSuccess`, add `paystackReference: payload.data.reference` to
the `findOneAndUpdate` update object. In the verify route, add it from `order.reference`
(they're the same value). One-liner each.

---

## 7. No maximum deposit limit

**File:** `src/app/api/v1/vendor/wallet/topup/route.ts`

**Problem:** Server only validates `amountGhs >= 100` (GHS 1). No upper bound. A vendor
could initiate a GHS 1,000,000 topup. Paystack would attempt to process it; if it goes
through, wallet is credited. No business rule controls this.

**Fix:** Add `amountGhs > 500_000` (GHS 5,000) check returning 400. Adjust the ceiling to
whatever the business decides. Also add it to the client-side input validation.

---

## Files touched summary

| File | Changes |
|------|---------|
| `src/app/api/v1/orders/guest/route.ts` | Prefix references with `OR` |
| `src/app/api/v1/orders/vendor/route.ts` | Prefix references with `WL` |
| `src/app/api/v1/paystack/webhook/route.ts` | Fix processed flag, add charge.failed handler |
| `src/app/api/v1/vendor/wallet/topup/route.ts` | Dedup pending topup, add max limit |
| `src/app/api/v1/admin/orders/[id]/verify/route.ts` | Call tryAutoSend, populate paystackReference |
| `src/app/vendor/wallet/page.tsx` | Disable button on submit, handle ?topup=cancelled |
| `src/lib/models/wallet-topup.ts` | Add `expiresAt` field |

---

## Out of scope (noted, not fixing now)

- Webhook retry queue (Bull/Redis) — requires infrastructure change
- Admin topup history view — separate feature
- Optimistic balance update on client — UX improvement
- Vendor status check in webhook — suspended vendors can't top up via the UI anyway
