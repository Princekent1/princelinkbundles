# Vendor Pricing — Implementation Plan

## Overview

Add a `vendorPriceGhs` field to every bundle so approved vendors (resellers) pay a lower price than the general public. Guests always pay `priceGhs`. Vendors always pay `vendorPriceGhs`. The split is applied at the wallet-debit and order-recording layer; nothing changes for Paystack (guests only).

**Key rule:** if `vendorPriceGhs` is `null` on a bundle, vendors fall back to `priceGhs`. This lets admins roll out the feature bundle-by-bundle without a forced migration.

---

## 1. Data Model — `src/lib/models/bundle.ts`

### TypeScript type
Add one optional field:
```ts
vendorPriceGhs?: number | null; // pesewas — null means "same as priceGhs"
```

### Mongoose schema
```ts
vendorPriceGhs: { type: Number, default: null },
```

No migration script needed. Existing documents will have `vendorPriceGhs: null` and the fallback rule above covers them.

**Helper function** — add this to the model file (or to `src/lib/bundle-name.ts` / a shared util):
```ts
export function effectiveVendorPrice(bundle: { priceGhs: number; vendorPriceGhs?: number | null }) {
  return bundle.vendorPriceGhs ?? bundle.priceGhs;
}
```
This is the single source of truth. Use it everywhere vendor price is needed — never inline the `??` logic.

---

## 2. Public Bundle Listing API — `src/app/api/v1/bundles/route.ts`

### Current behaviour
Returns `priceGhs` for everyone. The route has no auth check.

### Change
Add auth detection. If the request comes from an authenticated, approved vendor, include `vendorPriceGhs` in the response. Guests and unauthenticated users get only `priceGhs`.

```ts
// After fetching bundles:
const authUser = await getAuthUser().catch(() => null);
const isVendor = authUser?.role === "vendor" && authUser?.status === "approved";

bundles: bundles.map((b) => ({
  _id: b._id.toString(),
  network: b.network,
  name: deriveBundleName(b.volumeMb),
  validity: formatValidity(b.validityDays),
  validityDays: b.validityDays,
  priceGhs: b.priceGhs,
  sortOrder: b.sortOrder,
  // only expose vendor price to approved vendors
  ...(isVendor && { vendorPriceGhs: effectiveVendorPrice(b) }),
}))
```

**Why expose it here rather than just at checkout?**
The vendor bundle-selection page needs to show the vendor price so resellers know what they'll be charged before clicking "Buy".

---

## 3. Vendor Order Route — `src/app/api/v1/orders/vendor/route.ts`

This is the most critical change. Replace every reference to `bundle.priceGhs` with `effectiveVendorPrice(bundle)`.

### Wallet debit (lines ~54–63)
```ts
// before
{ walletBalance: { $gte: bundle.priceGhs } },
{ $inc: { walletBalance: -bundle.priceGhs } }

// after
const price = effectiveVendorPrice(bundle);
{ walletBalance: { $gte: price } },
{ $inc: { walletBalance: -price } }
```

### Order creation (line ~81)
```ts
// before
amountGhs: bundle.priceGhs,

// after
amountGhs: price,
```

### Wallet transaction (line ~87)
```ts
// before
amountGhs: -bundle.priceGhs,

// after
amountGhs: -price,
```

### Response (line ~101)
```ts
// before
amountGhs: bundle.priceGhs,

// after
amountGhs: price,
```

**Important:** The `price` variable must be derived once at the top of the handler (after fetching the bundle) and used consistently throughout. Don't re-derive it inline to avoid drift.

---

## 4. Admin Bundle API — `src/app/api/v1/admin/bundles/route.ts` (POST)

### Destructure new field from body
```ts
const { network, volumeMb, validityDays, priceGhs, vendorPriceGhs, sortOrder, jaybartPackageId, jaybartNetworkId } = body;
```

### Validation
```ts
if (vendorPriceGhs !== undefined && vendorPriceGhs !== null) {
  if (typeof vendorPriceGhs !== "number" || vendorPriceGhs <= 0) {
    return createErrorResponse("ValidationError", "vendorPriceGhs must be a positive number (pesewas)");
  }
  if (vendorPriceGhs >= priceGhs) {
    return createErrorResponse("ValidationError", "vendorPriceGhs must be less than priceGhs");
  }
}
```

The second validation (vendor price must be less than public price) keeps pricing logic sane. Admin can't accidentally set vendor price higher.

### Bundle creation
```ts
await BundleModel.create({
  ...
  priceGhs,
  vendorPriceGhs: vendorPriceGhs ?? null,
  ...
});
```

### Response — include in the returned object
```ts
priceGhs: bundle.priceGhs,
vendorPriceGhs: bundle.vendorPriceGhs ?? null,
```

---

## 5. Admin Bundle Update API — `src/app/api/v1/admin/bundles/[id]/route.ts` (PATCH)

### Destructure
```ts
const { priceGhs, vendorPriceGhs, jaybartPackageId, jaybartNetworkId } = body;
```

### Apply update
```ts
if (vendorPriceGhs !== undefined) {
  if (vendorPriceGhs !== null) {
    if (typeof vendorPriceGhs !== "number" || vendorPriceGhs <= 0) {
      return createErrorResponse("ValidationError", "vendorPriceGhs must be a positive number (pesewas)");
    }
    // compare against existing priceGhs if not being updated simultaneously
    const effectivePublicPrice = priceGhs ?? existingBundle.priceGhs;
    if (vendorPriceGhs >= effectivePublicPrice) {
      return createErrorResponse("ValidationError", "vendorPriceGhs must be less than priceGhs");
    }
  }
  update.vendorPriceGhs = vendorPriceGhs; // null clears the vendor price (falls back to public)
}
```

Note: the PATCH route currently fetches the existing bundle to check existence — use that same document to access `existingBundle.priceGhs` for the comparison above.

### Response
```ts
vendorPriceGhs: bundle.vendorPriceGhs ?? null,
```

---

## 6. Client-Side Types — `src/api/index.ts`

### `PublicBundle`
```ts
export type PublicBundle = {
  _id: string;
  network: string;
  name: string;
  validity: string;
  validityDays: number;
  priceGhs: number;
  sortOrder: number;
  vendorPriceGhs?: number; // present only if the current user is an approved vendor
};
```

### `AdminBundleItem`
```ts
export type AdminBundleItem = {
  ...
  priceGhs: number;
  vendorPriceGhs: number | null;
  ...
};
```

### `CreateBundleInput`
```ts
export type CreateBundleInput = {
  ...
  priceGhs: number;
  vendorPriceGhs?: number | null;
  ...
};
```

### `updateBundle` payload type
```ts
fn: async (id: string, data: {
  priceGhs?: number;
  vendorPriceGhs?: number | null;
  jaybartPackageId?: number | null;
  jaybartNetworkId?: number | null;
}): Promise<AdminBundleItem>
```

---

## 7. Checkout Page — `src/app/checkout/page.tsx`

Three lines reference `bundle.priceGhs` directly and must be updated for vendor sessions.

### Affordability check (line ~50)
```ts
// before
const canAfford = isVendor && bundle ? walletBalance >= bundle.priceGhs : false;

// after — bundle.vendorPriceGhs is already the effective price (set by the API for vendors)
const bundlePrice = isVendor ? (bundle.vendorPriceGhs ?? bundle.priceGhs) : bundle.priceGhs;
const canAfford = isVendor && bundle ? walletBalance >= bundlePrice : false;
```

Derive `bundlePrice` once at the top of the component, then use it everywhere below.

### Fee calculation (line ~53)
```ts
// The fee util is called with the base price — for vendors this call is irrelevant
// (vendor orders don't go through Paystack) but keeping it consistent:
calculatePaystackFee(bundlePrice, ...)
```

### Price display in order summary (line ~145)
```ts
<div className="bh-display text-[22px]">{ghsp(bundlePrice)}</div>
```

### Button label (line ~233)
```ts
`Pay with Wallet · ${bundle ? ghsp(bundlePrice) : ""}`
```

---

## 8. Bundle Selection Page — `src/app/bundles/[network]/page.tsx`

When a vendor is viewing bundles, show `vendorPriceGhs` alongside or instead of `priceGhs`.

The API already conditionally returns `vendorPriceGhs` for vendors, so the data is available. Two display options:

**Option A — Replace price:** Show only the vendor price (simpler, less confusing for resellers)
```tsx
{ghsp(b.vendorPriceGhs ?? b.priceGhs)}
```

**Option B — Show both with strikethrough:** Show public price struck through, vendor price highlighted
```tsx
{isVendor && b.vendorPriceGhs ? (
  <>
    <span style={{ textDecoration: "line-through", opacity: 0.4 }}>{ghsp(b.priceGhs)}</span>
    <span style={{ color: "var(--brand-500)", fontWeight: 700 }}>{ghsp(b.vendorPriceGhs)}</span>
  </>
) : ghsp(b.priceGhs)}
```

Option B is better UX — it reinforces the reseller discount.

Determine `isVendor` from auth store: `useAuthStore(s => s.user)?.role === "vendor"`.

---

## 9. Admin Bundles UI — `src/app/admin/bundles/page.tsx`

### Table column
Add a "Vendor Price" column next to the existing "Price" column:
```tsx
<td>{b.vendorPriceGhs ? ghsp(b.vendorPriceGhs) : <span style={{ opacity: 0.4 }}>—</span>}</td>
```

### Create dialog
Add a `vendorPriceGhs` input field below the public price:
```tsx
<div>
  <label>Vendor Price (GHS)</label>
  <input
    type="number"
    placeholder="Leave blank to match public price"
    value={createForm.vendorPriceGhs}
    onChange={...}
  />
</div>
```

The input is optional. If left blank, send `null` in the payload (falls back to public price).

Conversion: same as `priceGhs` — `Math.round(parseFloat(value) * 100)` for pesewas.

### Edit dialog
Same — add vendor price input. Pre-fill with `(b.vendorPriceGhs / 100).toFixed(2)` if set, otherwise empty.

### State
Add `vendorPriceGhs: ""` to both `createForm` and `editForm` state objects.

---

## 10. Networks Page — `src/app/networks/page.tsx`

Currently shows "from GHS X" using `Math.min(...bundles.map(b => b.priceGhs))`.

For vendor sessions, use `Math.min(...bundles.map(b => b.vendorPriceGhs ?? b.priceGhs))`.

Derive `isVendor` from auth store and switch the min calculation accordingly.

---

## Implementation Order

Do these in sequence to avoid broken states mid-way:

1. **Bundle model** — add field + `effectiveVendorPrice` helper
2. **Admin bundle API (POST + PATCH)** — accept and store `vendorPriceGhs`
3. **Admin UI** — add vendor price fields to create/edit dialogs and table column
4. **Public bundles API** — include `vendorPriceGhs` for vendor sessions
5. **Client types** — update `PublicBundle`, `AdminBundleItem`, `CreateBundleInput`, `updateBundle`
6. **Vendor order route** — swap `bundle.priceGhs` for `effectiveVendorPrice(bundle)`
7. **Checkout page** — derive `bundlePrice` from vendor price when applicable
8. **Bundle selection page** — show vendor price with optional strikethrough
9. **Networks page** — use vendor price for "from GHS" when applicable

Steps 1–3 can ship first as a safe, non-breaking change (prices just aren't applied yet). Steps 6–9 are what actually activates the split pricing.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Bundle has `vendorPriceGhs: null` | `effectiveVendorPrice` returns `priceGhs` — no discount |
| Admin sets `vendorPriceGhs >= priceGhs` | Rejected by API validation |
| Admin clears vendor price (sets to null) | Allowed — falls back to public price |
| Guest accesses `/api/v1/bundles` | Never receives `vendorPriceGhs` |
| Vendor order placed for bundle with `null` vendorPriceGhs | Charges `priceGhs` — correct fallback |
| Wallet balance exactly equals vendor price | Order succeeds (`$gte` check) |
| `priceGhs` updated without updating `vendorPriceGhs` | `effectiveVendorPrice` still valid; admin should review vendor price manually |

---

## What Does NOT Change

- Guest order route (`/api/v1/orders/guest`) — always uses `priceGhs`, no touch needed
- Paystack fee calculation — only ever applied to guest orders
- Order model — `amountGhs` already stores "what was actually charged", which will be the vendor price for vendor orders
- Wallet topup flow — unrelated
- Admin orders / refund logic — uses `order.amountGhs` (the snapshot), which is already correct
