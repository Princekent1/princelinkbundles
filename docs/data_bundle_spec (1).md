# Data Bundle Platform — Technical Specification

**Client:** [Client Name]
**Date:** May 2026
**Budget:** GHC 1,500 (client covers all infrastructure)
**Status:** Draft v2 — vendor + wallet scope

---

## 1. Overview

A web platform for buying mobile data bundles for Ghanaian networks (MTN, Telecel, AirtelTigo) with payment via Paystack Mobile Money. The platform serves three audiences:

- **Guests** — one-off buyers, no account needed.
- **Vendors (resellers)** — primary target; signed-up users with a wallet for high-frequency purchases.
- **Admin** — the client; fulfills orders manually and approves vendors.

### 1.1 Goals

- Guests can buy a bundle in under 60 seconds without an account.
- Vendors can place orders against a pre-loaded wallet balance — no Paystack redirect per order.
- Admin sees every order, can manage vendors, can refund manually.
- Order fulfillment remains manual; payment confirmation is automated.

### 1.2 Out of scope (locked — additions are billed separately)

- CSV bulk upload for vendors
- Custom per-vendor pricing tiers
- Auto-refund on order failure (admin handles manually — see §8.4)
- WhatsApp community integration
- SMS notifications
- Multi-admin roles
- Automated bundle delivery via network APIs
- Mobile app (web-responsive only)
- Sub-vendor / referral hierarchies
- Reports beyond the dashboard summary

This list is exhaustive. Anything not in this document is a separate engagement.

---

## 2. User Roles

### 2.1 Guest
- No account. Buys via Paystack redirect.
- Looks up order by phone number + 6-char reference.
- Order has no `placedBy` association.

### 2.2 Vendor
- Self-signs up at `/signup` → account created with status `PENDING`.
- Cannot log in until admin approves → status moves to `APPROVED`.
- Once approved: tops up wallet via Paystack, places orders that deduct from wallet balance.
- Admin can also `SUSPENDED` a vendor (login blocked, wallet frozen).

### 2.3 Admin
- Seeded via env vars on first deploy (no signup).
- Manages bundles, vendors, and all orders.
- Performs manual refunds (credits a vendor's wallet).

---

## 3. Architecture

### 3.1 Stack
- **Runtime:** Bun
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** MongoDB (Atlas free tier to start)
- **ODM:** Mongoose
- **Auth:** custom session implementation (sessions collection with TTL index)
- **Payments:** Paystack (hosted checkout + webhooks)
- **Hosting:** Vercel + MongoDB Atlas

### 3.2 Single-app, role-based structure

One Next.js codebase. Routes grouped by audience. Middleware enforces role.

```
app/
  (public)/
    page.tsx                    # homepage with networks
    bundles/[network]/
    checkout/
    order-status/
  (auth)/
    login/                      # single login form for vendors + admins
    signup/                     # vendor self-signup
    pending/                    # "your account is pending approval"
  (vendor)/
    vendor/
      dashboard/
      orders/
      wallet/
      settings/
  (admin)/
    admin/
      dashboard/
      orders/
      vendors/
      vendors/[id]/
      bundles/
  api/
    bundles/                    # GET catalog
    orders/
      guest/                    # POST create guest order (Paystack flow)
      vendor/                   # POST create vendor order (wallet flow)
      lookup/                   # GET by reference + phone
    paystack/
      initialize/               # for guest orders + wallet top-ups
      webhook/                  # receives all Paystack events
    auth/
      login/
      signup/
      logout/
    vendor/
      wallet/topup/             # initiate wallet top-up
    admin/
      orders/[id]/complete/
      orders/[id]/fail/
      vendors/                  # list, search
      vendors/[id]/approve/
      vendors/[id]/suspend/
      vendors/[id]/refund/      # credit wallet
      bundles/                  # CRUD
lib/
  db/                           # Mongoose models + connection
  paystack/
  auth/
  reference/                    # base62 generator
  wallet/                       # atomic balance ops
middleware.ts                   # role-based gate
```

### 3.3 Middleware behavior

```
/admin/*   → require session.role === "admin"
/vendor/*  → require session.role === "vendor" && status === "APPROVED"
/login     → if already authed, redirect to role's dashboard
```

A pending vendor hitting `/vendor/*` gets bounced to `/pending`. A suspended vendor gets logged out.

---

## 4. Data Model

### 4.1 Order reference format

6-char base62 (`0-9A-Za-z`). 62⁶ ≈ 56.8 billion. Generated server-side via `crypto.randomBytes`. Unique index on `orders.reference`. Case-sensitive in storage.

### 4.2 Collections

#### `users`
Holds vendors and admins. Guests are not in this collection.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| email | string (unique) | |
| password | string | bcrypt hash |
| phone | string | |
| role | enum | `vendor`, `admin` |
| status | enum | `PENDING`, `APPROVED`, `SUSPENDED` (admins are always `APPROVED`) |
| businessName | string \| null | vendor only |
| walletBalance | Decimal128 | starts at 0; vendor only |
| approvedAt | Date \| null | |
| approvedBy | ObjectId \| null | FK → users._id |
| createdAt, updatedAt | Date | |

Index: `email` unique, `role`, `status`.

#### `bundles`

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| network | enum | `MTN`, `TELECEL`, `AIRTELTIGO` |
| name | string | |
| volumeMb | number | |
| validityDays | number | |
| priceGhs | Decimal128 | |
| sortOrder | number | |
| archivedAt | Date \| null | |
| archivedBy | ObjectId \| null | |
| createdAt, updatedAt | Date | |

#### `orders`

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| reference | string (unique) | 6-char base62 |
| placedBy | ObjectId \| null | FK → users._id; null for guests |
| paymentMethod | enum | `PAYSTACK`, `WALLET` |
| customerPhone | string | the SIM receiving data |
| customerEmail | string \| null | |
| bundleId | ObjectId | |
| bundleNameSnapshot | string | |
| networkSnapshot | enum | |
| amountGhs | Decimal128 | |
| status | enum | `PENDING_PAYMENT`, `PAID`, `COMPLETED`, `FAILED`, `CANCELLED` |
| paystackReference | string \| null | only for `PAYSTACK` orders |
| paidAt | Date \| null | |
| completedAt | Date \| null | |
| completedBy | ObjectId \| null | admin who marked done |
| failedAt | Date \| null | |
| failedBy | ObjectId \| null | admin who marked failed |
| failureReason | string \| null | |
| createdAt, updatedAt | Date | |

Indexes: `reference` unique, `placedBy`, `status`, `createdAt`, `customerPhone`.

#### `walletTransactions`
Append-only ledger of every wallet movement. Critical for audit.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| vendorId | ObjectId | FK → users._id |
| type | enum | `TOPUP`, `PURCHASE`, `REFUND`, `ADJUSTMENT` |
| amountGhs | Decimal128 | positive for credit, negative for debit |
| balanceAfter | Decimal128 | snapshot for fast statement rendering |
| relatedOrderId | ObjectId \| null | for `PURCHASE` / `REFUND` |
| relatedTopupId | ObjectId \| null | for `TOPUP` |
| performedBy | ObjectId \| null | admin id for `ADJUSTMENT` / `REFUND` |
| note | string \| null | admin reason for adjustments |
| createdAt | Date | |

Index: `vendorId + createdAt` compound.

#### `walletTopups`
Tracks vendor wallet top-up attempts (separate from the bundle order flow because a top-up isn't an "order").

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| vendorId | ObjectId | |
| reference | string (unique) | 6-char base62 |
| amountGhs | Decimal128 | |
| status | enum | `PENDING`, `SUCCESS`, `FAILED` |
| paystackReference | string \| null | |
| paidAt | Date \| null | |
| createdAt, updatedAt | Date | |

#### `paymentEvents`
Append-only log of every Paystack webhook.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| paystackEventId | string (unique) | dedupes retries |
| eventType | string | |
| relatedOrderId | ObjectId \| null | |
| relatedTopupId | ObjectId \| null | |
| rawPayload | object | |
| receivedAt | Date | |
| processed | boolean | |

#### `sessions`

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| userId | ObjectId | |
| expiresAt | Date | TTL index |
| createdAt | Date | |

#### `auditLog` (optional)

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| actorId | ObjectId | |
| action | string | e.g., `vendor.approved`, `order.completed`, `wallet.refunded` |
| targetType | string | |
| targetId | ObjectId | |
| metadata | object | |
| createdAt | Date | |

---

## 5. User Flows

### 5.1 Guest purchase
1. Lands on homepage → picks network → picks bundle.
2. Enters beneficiary phone number.
3. `POST /api/orders/guest` creates order, status `PENDING_PAYMENT`, `paymentMethod: PAYSTACK`.
4. Server initializes Paystack transaction → returns authorization URL → frontend redirects.
5. Customer pays → Paystack redirects to `/checkout/callback?reference=...`.
6. Webhook fires in parallel → order status → `PAID`.
7. Customer sees confirmation with reference. Tells them to save it.

### 5.2 Guest order lookup
- Form on homepage: phone number + reference → returns status only.

### 5.3 Vendor signup → approval
1. Vendor fills signup form (email, password, phone, business name).
2. `POST /api/auth/signup` creates user with `role: vendor`, `status: PENDING`.
3. Vendor sees "your account is pending approval" page. Cannot log in.
4. Admin sees new vendor in `/admin/vendors` filtered by Pending.
5. Admin clicks Approve → status → `APPROVED`. Vendor can now log in.
6. (No automated email notification in v1 — admin tells vendor manually. SMS/email is in §1.2 out-of-scope.)

### 5.4 Vendor wallet top-up
1. Vendor clicks "Top Up Wallet" → enters amount.
2. `POST /api/vendor/wallet/topup` creates a `walletTopups` doc with status `PENDING` and unique reference.
3. Server initializes Paystack transaction with this reference → vendor redirects.
4. Vendor pays → returns to `/vendor/wallet?reference=...`.
5. Webhook fires → matches by `paystackReference` → marks topup `SUCCESS`, creates `walletTransactions` row of type `TOPUP`, increments `users.walletBalance` atomically.
6. Vendor sees updated balance.

### 5.5 Vendor purchase (wallet flow)
1. Vendor logged in → picks network → bundle → enters beneficiary phone.
2. `POST /api/orders/vendor` runs an atomic operation:
   ```
   findOneAndUpdate(
     { _id: vendorId, walletBalance: { $gte: price } },
     { $inc: { walletBalance: -price } }
   )
   ```
   If no doc returned → insufficient funds → return error.
3. On success: create order with `status: PAID`, `paymentMethod: WALLET`, `placedBy: vendorId`.
4. Create `walletTransactions` row of type `PURCHASE`, negative amount.
5. Vendor sees confirmation immediately. No Paystack redirect.

### 5.6 Admin fulfillment
1. Admin logs in → `/admin/dashboard`.
2. `/admin/orders` shows all orders, filterable by status, network, payment method, date, vendor, phone, reference.
3. Admin sends data manually via existing process.
4. Marks order Completed → status → `COMPLETED`, `completedAt`/`completedBy` set.

### 5.7 Admin failure + manual refund
1. If admin can't fulfill: marks order Failed with reason → status → `FAILED`.
2. **Wallet is NOT auto-refunded** (per §1.2 / §8.4).
3. Admin separately decides to refund: clicks Refund on the failed order → wallet credited, `walletTransactions` row of type `REFUND` created. Order is now `FAILED` + refunded.
4. For Paystack-paid orders (guests), refund is handled offline via Paystack dashboard. The system doesn't try to issue Paystack refunds.

### 5.8 Admin vendor management
- `/admin/vendors` → list with filters: status (pending/approved/suspended), search by email/phone.
- Detail page `/admin/vendors/[id]` → vendor info, wallet balance, transaction history, orders placed.
- Actions: Approve, Suspend, Reactivate, Manual wallet adjustment (with required note).

---

## 6. Authentication

### 6.1 One login page
`/login` → email + password → on success, server checks `role` and `status`:
- `admin` → redirect `/admin/dashboard`
- `vendor` + `APPROVED` → redirect `/vendor/dashboard`
- `vendor` + `PENDING` → redirect `/pending`
- `vendor` + `SUSPENDED` → return generic auth error (don't tell them they're suspended; they can contact support)

### 6.2 Session
- HttpOnly, Secure, SameSite=Lax cookie containing session ID.
- `sessions` collection with TTL index on `expiresAt`.
- 7-day rolling expiry.
- Logout deletes the session document.

### 6.3 Password rules
- bcrypt cost 12.
- Minimum 8 characters at signup. No other complexity rules — they're more annoying than secure.
- No "forgot password" flow in v1. Out of scope; admin can manually reset by direct DB edit if needed. **Flag this to the client.**

### 6.4 Rate limiting
- `/login`: 5 attempts per 15 min per IP.
- `/signup`: 3 per hour per IP.

---

## 7. Wallet Mechanics

### 7.1 Atomicity
Every balance change goes through `findOneAndUpdate` with a balance precondition. This prevents race conditions where two simultaneous orders could overdraw.

```js
// purchase
const result = await User.findOneAndUpdate(
  { _id: vendorId, status: "APPROVED", walletBalance: { $gte: price } },
  { $inc: { walletBalance: -price } },
  { new: true }
);
if (!result) throw new InsufficientFundsError();
```

### 7.2 Always paired with a ledger entry
A balance change without a `walletTransactions` row is a bug. Wrap both writes in a Mongo transaction (Atlas supports this on replica sets, which the free tier is).

### 7.3 Reconciliation
- Vendor's running balance = sum of all `walletTransactions` where `vendorId = X`.
- This sum should always equal `users.walletBalance`.
- Recommended: a `/admin/vendors/[id]/reconcile` button that recomputes and flags drift. Not strictly necessary for v1 but cheap to add.

### 7.4 Decimal handling
All money fields are `Decimal128`. Never use JS `Number` for currency. Mongoose has built-in support; just declare the schema field as `mongoose.Schema.Types.Decimal128`.

---

## 8. Payment Integration

### 8.1 Two payment contexts, one webhook
Both guest orders and wallet top-ups go through Paystack. The webhook handler distinguishes by looking up the reference in `orders` first, then `walletTopups`.

### 8.2 Webhook hardening
- Verify `x-paystack-signature` (HMAC SHA-512 of body with secret).
- Insert into `paymentEvents` first using `paystackEventId` as unique key. If duplicate → already processed, return 200.
- Process within a Mongo transaction.
- Always return 200 unless signature fails.

### 8.3 Edge cases
- **Webhook never arrives:** admin has a "Verify with Paystack" button on order/topup detail that calls Paystack's verify endpoint and updates state.
- **Double-pay same reference:** second event logged but no-op.
- **Customer abandons:** order/topup sits `PENDING_PAYMENT`. A manual cleanup or 24h cron can mark them `CANCELLED`. Cron is not in v1 — admin can ignore them.

### 8.4 Refunds
- **No automatic refunds anywhere.** Admin decides per case.
- For wallet (vendor) orders → refund button credits wallet via `walletTransactions` row.
- For Paystack (guest) orders → handled outside the system in the Paystack dashboard.

---

## 9. Admin Capabilities Summary

- **Dashboard:** pending orders count, today's revenue, all-time revenue, pending vendors count.
- **Orders:** filter by status / network / payment method / date / vendor / phone / reference. Mark Complete, Mark Failed, Refund (wallet orders), Verify with Paystack.
- **Vendors:** list, search, filter by status. Approve, Suspend, Reactivate. Detail page shows wallet history. Manual wallet adjustment with required note.
- **Bundles:** CRUD — add, edit, archive (soft delete). Editing price doesn't retroactively change historical order amounts (snapshots preserve them).

---

## 10. Non-Functional Requirements

### 10.1 Security
- HTTPS everywhere (Vercel handles).
- Paystack secret in env vars only.
- All admin/vendor routes behind middleware.
- Rate limits on auth endpoints.
- No PII in order lookup response — status only.

### 10.2 Performance
- Bundle catalog cached at edge, revalidate on update.
- Paginated lists (50/page).
- Indexes documented in §4.

### 10.3 Reliability
- Webhook idempotent.
- Wallet operations atomic.
- DB backups: Atlas's automated snapshots on the chosen tier.

---

## 11. Deployment

### 11.1 Client must provide
- Domain with DNS access
- Paystack account + API keys + webhook URL configured
- MongoDB Atlas cluster (M0 free tier sufficient at start)
- Vercel account
- Initial admin email + password (for seed)

### 11.2 Environment variables
```
MONGODB_URI=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
SESSION_SECRET=
APP_URL=https://bundles.theirbusiness.com
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

### 11.3 Pre-launch checklist
- End-to-end guest purchase in Paystack test mode
- End-to-end vendor flow: signup → approve → top up → purchase → admin marks complete
- Webhook delivery test (Paystack tool)
- Manual refund flow on a wallet order
- Bundle archive doesn't break existing orders
- Vendor with insufficient balance gets blocked
- Suspended vendor cannot log in
- Switch Paystack to live mode
- Real GHC 1 transaction
- Hand over admin credentials securely

---

## 12. Timeline

Roughly 3 weeks now (was 2 before vendor + wallet was added).

| Week | Deliverable |
|---|---|
| W1, days 1–2 | Setup, DB models, auth + middleware |
| W1, days 3–5 | Public flows: catalog, guest checkout, lookup, Paystack init |
| W2, days 1–2 | Paystack webhook (orders + topups) + verification tooling |
| W2, days 3–4 | Vendor flows: signup, login, dashboard, wallet top-up, purchase |
| W2, day 5 | Admin: orders, fulfillment, bundle CRUD |
| W3, days 1–2 | Admin: vendors list, approval, suspension, manual refund/adjustment |
| W3, day 3 | End-to-end testing |
| W3, days 4–5 | Deployment, handover, buffer |

### Post-launch
- 2 weeks of bug fixes included.
- After 2 weeks, changes/features billed at agreed hourly rate.

---

## 13. Scope Lock

This document is the full scope at GHC 1,500. Items in §1.2 are explicitly excluded. Any addition is a separate quote.

The project has expanded from "guest checkout MVP" to "guest + vendor + wallet + admin vendor management" without a price change. The client should acknowledge this scope in writing before development begins.

---

## 14. Open Questions

1. Domain — registered? subdomain plan? (e.g., `bundles.client.com` or root domain)
2. Bundle catalog — spreadsheet of all bundles, prices, validity ready?
3. Branding — logo, colors?
4. Paystack — account verified and live keys available?
5. Vendor approval criteria — what does the client check before approving? (Affects what fields we capture at signup.)
6. Minimum top-up amount — is there a floor? (Prevents tiny top-ups that aren't worth Paystack's transaction fee.)
7. Will the client want vendors to see their order history forever, or is there a retention period?
