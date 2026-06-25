# Data Bundle Platform — Technical Specification

**Client:** [Client Name]
**Date:** May 2026
**Budget:** GHC 1,500 (client covers all infrastructure)
**Status:** Draft for client review

---

## 1. Overview

A web platform where customers buy mobile data bundles for Ghanaian networks (MTN, Telecel, AirtelTigo) and pay via Mobile Money through Paystack. The admin (client) fulfills orders manually from a private dashboard.

### 1.1 Goals

- Customers can buy a bundle in under 60 seconds, no account required.
- Admin sees every order in real time, with all details needed to fulfill.
- Payment confirmation is automated; fulfillment is manual.
- Customers can check their order status anytime by phone number.

### 1.2 Out of scope (for this build)

These are explicitly NOT included in the GHC 1,500 scope. They are listed here so the client knows what's deferred — any of them can be added later as a separate engagement.

- Wallet/top-up system
- CSV bulk upload for resellers
- "Become a Dealer" tier with custom pricing
- WhatsApp community integration
- SMS notifications (email-only or in-app status checks)
- Multi-admin roles and permissions
- Automated fulfillment via network APIs
- Mobile app (web-responsive only)

---

## 2. User Roles

### 2.1 Customer (no account required)
- Browses bundles
- Places an order using their phone number as identifier
- Pays via Paystack
- Receives confirmation with order reference
- Looks up order status anytime using phone number + order reference

### 2.2 Admin (single user — the client)
- Logs in to a protected `/admin` route
- Views all incoming orders
- Filters by status, network, date
- Marks orders as completed once data is sent
- Views basic sales totals

There is no "user account" tier in this build. Phone number is the customer identifier. If accounts are needed later, they can be added without breaking the existing flow.

---

## 3. User Flows

### 3.1 Customer purchase flow

1. Customer lands on homepage → sees networks (MTN, Telecel, AirtelTigo).
2. Selects network → sees list of bundles for that network with prices.
3. Picks a bundle → enters their phone number (the SIM that will receive the data).
4. Confirms order summary → clicks "Pay with Mobile Money."
5. Redirected to Paystack hosted checkout → completes payment.
6. Redirected back to a confirmation page showing order reference + status.
7. Receives same details via Paystack's standard payment receipt email (if Paystack collected email; otherwise the on-screen reference is the only record).

**Important:** Customer should screenshot or save the order reference. They'll need it (plus their phone number) to look up order status.

### 3.2 Customer order lookup flow

1. Clicks "Check Order Status" on homepage.
2. Enters phone number + order reference.
3. Sees current status (Pending / Processing / Completed / Failed).

### 3.3 Admin fulfillment flow

1. Admin logs in at `/admin/login`.
2. Lands on dashboard showing pending orders count, today's sales, all-time sales.
3. Clicks "Orders" → sees table of orders, newest first, filtered to "Pending" by default.
4. For each order, sees: order ref, customer phone, network, bundle name, amount, paid-at timestamp, status.
5. Sends data to customer's phone manually (using whatever process the client already uses).
6. Clicks "Mark as Completed" on the order row → status updates, order moves out of Pending view.

---

## 4. Data Model

Six collections. Kept deliberately minimal.

### 4.1 Order reference format

**Format:** 6 characters, base62 alphabet (`0-9`, `A-Z`, `a-z`).

**Properties:**
- 62⁶ = ~56.8 billion possible values. Way more than this business will ever generate.
- Generated server-side using a CSPRNG (`crypto.randomBytes`), not `Math.random`.
- Uniqueness enforced by a unique index on `orders.reference`. On the (extremely rare) collision, retry generation. In practice you'll never hit this.
- Customer-facing — short enough to read over the phone, type on a small keyboard, or write down.
- **Case-sensitive** in storage and comparison. Worth noting because phone-keyboard typing can fumble case. If support calls become a thing, you can switch lookup to case-insensitive (and shrink the alphabet to base36) without a data migration — but I'd start strict.

**Example:** `7K9M2A`, `xQ4nP1`, `0bZcD8`

**Optional prefix:** if the client wants `DF-7K9M2A` style for branding, that's purely a display concern — store the raw 6 chars and prepend `DF-` in the UI. Don't store the prefix.

### `bundles`
The catalog of what's for sale.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId (PK) | |
| network | enum | `MTN`, `TELECEL`, `AIRTELTIGO` |
| name | string | e.g., "1GB — 24 hours" |
| volumeMb | number | for sorting/display |
| validityDays | number | |
| priceGhs | Decimal128 | use Decimal128, not Number, to avoid float drift |
| sortOrder | number | manual ordering within network |
| archivedAt | Date \| null | null = live; set to deactivate |
| archivedBy | ObjectId \| null | FK → admins._id |
| createdAt, updatedAt | Date | |

### `orders`
One row per order placed.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId (PK) | |
| reference | string (unique) | 6-char base62, e.g. `7K9M2A` — see §4.1 |
| customerPhone | string | the SIM receiving the data |
| customerEmail | string \| null | if Paystack returns it |
| bundleId | ObjectId | FK → bundles._id |
| bundleNameSnapshot | string | preserve what they bought |
| networkSnapshot | enum | |
| amountGhs | Decimal128 | snapshot of price at time of purchase |
| status | enum | `PENDING_PAYMENT`, `PAID`, `COMPLETED`, `FAILED`, `CANCELLED` |
| paystackReference | string \| null | Paystack's own ref |
| paidAt | Date \| null | |
| completedAt | Date \| null | when admin marked done |
| completedBy | ObjectId \| null | FK → admins._id |
| createdAt, updatedAt | Date | |

### `admins`
Single document for now, but structured to support more later.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId (PK) | |
| email | string (unique) | |
| password | string | bcrypt hash stored here — field is just named `password` |
| name | string | |
| createdAt | Date | |

### `sessions`
Mongo-backed sessions for the admin (or use JWT in httpOnly cookie — your call). Standard fields: `_id`, `adminId`, `expiresAt`, `createdAt`. Add a TTL index on `expiresAt` so Mongo auto-cleans expired sessions.

### `paymentEvents`
Append-only log of every Paystack webhook received. Critical for debugging payment issues.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId (PK) | |
| orderId | ObjectId \| null | matched if possible |
| paystackEventId | string (unique index) | dedupes webhook retries |
| eventType | string | `charge.success`, `charge.failed`, etc. |
| rawPayload | object | full webhook body |
| receivedAt | Date | |
| processed | boolean | did we successfully act on it |

### `auditLog` (optional but recommended)
Tracks admin actions — useful if anything goes wrong.

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId (PK) | |
| adminId | ObjectId | FK → admins._id |
| action | string | e.g., `marked_order_completed` |
| targetType | string | `order` |
| targetId | ObjectId | |
| metadata | object | |
| createdAt | Date | |

---

## 5. Architecture

### 5.1 Stack
- **Runtime:** Bun
- **Framework:** Next.js (App Router) — frontend + API routes in one app
- **Styling:** Tailwind CSS
- **Database:** MongoDB (recommend MongoDB Atlas free tier; client picks)
- **ODM:** Mongoose (mature, schema validation built-in) or the official MongoDB driver if you want lighter
- **Auth:** custom session implementation backed by the `sessions` collection — there's only one admin, no need for NextAuth complexity
- **Payments:** Paystack (hosted checkout + webhooks)
- **Hosting:** Vercel (frontend) + MongoDB Atlas

### 5.2 Why a single Next.js app
- One codebase, one deploy, shared types between frontend and API.
- Admin and customer share auth helpers, DB layer, and design system.
- Role-based middleware gates `/admin/*` routes.
- If the client ever needs a separate backend (e.g., for a mobile app), the API routes can be lifted out later.

### 5.3 Folder structure (proposed)

```
app/
  (public)/              # customer-facing routes
    page.tsx             # homepage with networks
    bundles/[network]/
    checkout/
    order-status/
  (admin)/               # admin routes, protected by middleware
    admin/
      login/
      dashboard/
      orders/
  api/
    bundles/             # GET list of bundles
    orders/              # POST create order, GET lookup
    paystack/
      initialize/        # POST: create Paystack transaction
      webhook/           # POST: receive Paystack events
    admin/
      login/
      orders/
      orders/[id]/complete/
lib/
  db/                    # Mongoose models + connection
  paystack/              # Paystack SDK wrapper
  auth/                  # session helpers
  reference/             # base62 reference generator
middleware.ts            # protect /admin/*
```

---

## 6. Payment Integration (the part most likely to bite)

This is the highest-risk area in the build. Treat it carefully.

### 6.1 Payment flow

1. Customer submits order form → `POST /api/orders` creates an order row with status `PENDING_PAYMENT` and generates a unique `reference`.
2. Server calls Paystack `/transaction/initialize` with amount, customer email (or a placeholder), and our `reference`.
3. Paystack returns an `authorization_url` → server responds with that URL → frontend redirects.
4. Customer pays on Paystack's hosted page.
5. Paystack redirects customer back to `/checkout/callback?reference=...`. Frontend calls `GET /api/orders/verify?reference=...`.
6. **In parallel,** Paystack sends a webhook to `POST /api/paystack/webhook`. This is the source of truth.
7. Webhook handler verifies signature → looks up order by reference → marks `PAID` if `charge.success`.

### 6.2 Why both callback and webhook?

- The redirect callback gives a fast UX response, but the customer can close the tab before it fires. Never trust it alone.
- The webhook is reliable but can be delayed. Used as the authoritative state update.
- Both should be idempotent: if either fires twice, nothing breaks.

### 6.3 Webhook hardening checklist

- Verify Paystack signature on every request (`x-paystack-signature` HMAC SHA-512).
- Log every event to `payment_events` BEFORE processing, with `paystack_event_id` as a unique key. If the insert fails on duplicate, we've seen this event already — return 200 and stop.
- Wrap the order update in a transaction.
- Always return 200 to Paystack (even on no-op) so they don't retry forever. Return non-2xx only on signature failure.
- Add a manual "verify with Paystack" button on the admin order detail page for cases where things go sideways.

### 6.4 Edge cases to handle

- **Customer pays but webhook never arrives:** admin can manually verify order via Paystack dashboard, then mark as paid.
- **Customer pays twice:** second `charge.success` for same reference → log it but don't double-process.
- **Customer abandons after Paystack page:** order sits in `PENDING_PAYMENT` forever. A cron or scheduled job can mark these `CANCELLED` after 24h. (Optional for v1.)
- **Refunds:** out of scope. Handled manually via Paystack dashboard.

---

## 7. Admin Dashboard

### 7.1 Pages

- **`/admin/login`** — email + password form.
- **`/admin/dashboard`** — top-line numbers: pending count, today's revenue, all-time revenue, last 7 days chart (optional).
- **`/admin/orders`** — paginated table with filters:
  - Status (All / Pending / Paid / Completed / Failed)
  - Network (All / MTN / Telecel / AT)
  - Date range
  - Phone number search
  - Order reference search
- **`/admin/orders/[id]`** — full order detail with "Mark Completed" action and Paystack verification button.
- **`/admin/bundles`** — CRUD for the bundle catalog (add, edit, deactivate). Important so the client can adjust prices without calling you.

### 7.2 Auth requirements

- Password hashed with bcrypt (cost factor 12).
- Sessions in httpOnly, secure, sameSite=lax cookies.
- Rate limit `/admin/login` (e.g., 5 attempts per 15 min per IP).
- Session expires after 7 days of inactivity.
- Initial admin account seeded via a one-time script or env var (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) on first deploy.

---

## 8. Customer Order Lookup

A simple form on the homepage. The customer enters phone number + order reference. We return the order's current status. This is the entire reason we ask them to save the reference.

**Why both fields?** Phone number alone is not sensitive enough to authenticate a lookup — anyone could enter someone else's number. Requiring the reference makes it effectively a "claim ticket."

---

## 9. Non-Functional Requirements

### 9.1 Security
- All traffic over HTTPS (Vercel handles).
- Paystack secret key in env vars only, never in client code.
- SQL injection: prevented by ORM/parameterized queries.
- XSS: React handles by default; no `dangerouslySetInnerHTML`.
- Admin routes protected by middleware.
- No customer PII shown publicly — order lookup returns status only, not amount or full details.

### 9.2 Performance
- Bundle catalog cached at the edge (revalidate on update).
- Order list paginated (50/page).
- Mongo indexes: unique on `orders.reference` and `paymentEvents.paystackEventId`; non-unique on `orders.customerPhone`, `orders.status`, `orders.createdAt`; TTL on `sessions.expiresAt`.

### 9.3 Reliability
- Webhook processing is idempotent.
- Database backups: client's responsibility (most managed Postgres providers do this automatically — confirm with whoever they pick).

---

## 10. Deployment

### 10.1 What the client needs to provide
- A domain (e.g., `bundles.theirbusiness.com`) with DNS access
- A Paystack account with API keys (live + test) and webhook URL configured
- A managed MongoDB cluster (recommendation: MongoDB Atlas free tier — M0 is enough to start)
- A Vercel account (free tier is fine to start)
- Email address to seed the admin account

### 10.2 Environment variables
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

### 10.3 Pre-launch checklist
- Test purchase end-to-end in Paystack test mode
- Test webhook delivery (Paystack has a webhook test tool)
- Test admin login + order completion flow
- Seed at least 5 bundles per network
- Switch Paystack keys to live mode
- Verify the live webhook URL is reachable
- Do one real GHC 1 transaction to confirm
- Hand over admin credentials securely (1Password share link, not WhatsApp)

---

## 11. Timeline & Milestones

Working solo, this is roughly 2 weeks of focused work.

| Week | Deliverable |
|---|---|
| Week 1, days 1–2 | Project setup, DB schema, auth scaffolding |
| Week 1, days 3–5 | Customer flows: catalog, checkout, Paystack initialize |
| Week 2, days 1–2 | Paystack webhook + verification + status lookup |
| Week 2, days 3–4 | Admin dashboard + bundle CRUD |
| Week 2, day 5 | End-to-end testing, deployment, handover |

### Post-launch
- **2 weeks of bug fixes included** — anything broken or working differently than spec, no charge.
- **After 2 weeks:** changes and new features are billed separately. Recommended: agree on an hourly rate now (e.g., GHC 100–150/hr) so this doesn't become a debate later.

---

## 12. What's Explicitly NOT Included

(Repeating from §1.2, because clients forget.)

This price covers what's in this document. Anything beyond is a separate quote:
- SMS notifications
- Wallet system
- Bulk upload / CSV import
- Dealer pricing tiers
- WhatsApp community
- Mobile app
- Automated bundle delivery (network API integration)
- Multi-admin / staff roles
- Reports beyond what's on the dashboard

---

## 13. Open Questions for the Client

1. Domain name — registered already, or do you need help picking one?
2. Bundle list — can you provide a spreadsheet of all bundles, prices, and validity periods before development starts?
3. Branding — logo file, brand colors? (The "Data Fraternity" inspiration shows blue/yellow; what's yours?)
4. Paystack account — already created and verified, or do you need help?
5. Who handles refunds and customer complaints — you, directly? (No support tooling is being built.)
6. After launch, do you anticipate needing the wallet or bulk upload features in the next 3 months? (Affects how I structure the data model now.)
