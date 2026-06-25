# Bundle Hub — Build Plan

Spec reference: `data_bundle_spec (1).md` (v2, vendor + wallet scope)  
Progress snapshot: `PROGRESS.md` (both in `plans/`)

---

## Decisions (resolve before or during each phase)

| # | Decision | Options | Status |
|---|---|---|---|
| D1 | Login consolidation | Single `/login` (spec v2) → role-based redirect; OR keep `/admin/login` separate | **Done — consolidated to `/login`** |
| D2 | `/dashboard` fate | Repurpose as `/vendor/dashboard`; OR delete and rebuild fresh | **Done — redirects to `/vendor/dashboard`** |
| D3 | `/checkout/paystack` placeholder | Keep as Paystack handoff page; OR remove | Keep — useful as redirect buffer |
| D4 | Vendor shell component | Clone admin shell; OR extract shared shell | **Done — `VendorShell` built, mirrors admin pattern** |
| D5 | Reconcile button on vendor detail | Include now; OR skip for v1 | Skip for v1 — not added |

---

## Phase 1 — UI (current focus)

### 1A — Fix/update existing routes

- [x] **`/`** — responsive landing page (mobile-first); hero stacks on mobile, 2-col on desktop; network card preview hidden on mobile; how-it-works 2-col → 4-col
- [x] **`/login`** — single form for vendor + admin; removed tabs; links to `/signup`; mocks redirect to `/vendor/dashboard`
- [x] **`/admin/login`** — redirects to `/login`
- [x] **`/dashboard`** — redirects to `/vendor/dashboard`
- [x] **`/admin/orders`** — added Vendor column, Payment Method column + filter select
- [x] **`/admin/orders/[id]`** — added Mark Failed button + failure reason panel + conditional wallet refund section + payment method/vendor in detail rows

### 1B — New routes: auth + onboarding

- [x] **`/signup`** — vendor self-signup: business name, email, phone, password, confirm; submits → `/pending`
- [x] **`/pending`** — "Application under review"; what-happens-next steps; back to sign in

### 1C — New routes: vendor console

- [x] **`src/components/vendor/shell.tsx`** — sidebar with nav, wallet balance card, user footer + logout
- [x] **`/vendor/dashboard`** — stats row (balance, spent, pending); quick buy grid; recent orders table
- [x] **`/vendor/orders`** — table with status + payment method filters + search; WALLET/PAYSTACK badges
- [x] **`/vendor/wallet`** — balance hero; top-up panel (presets + custom); full transaction history
- [x] **`/vendor/settings`** — read-only profile; change password form; sign out section

### 1D — New routes: admin vendor management

- [x] **`/admin/vendors`** — table with status filter tabs + search; inline Approve/Suspend/Reactivate; links to detail
- [x] **`/admin/vendors/[id]`** — vendor header + contextual actions; wallet adjustment panel (amount + required note); wallet history; orders placed

### 1E — Shared components

- [x] **`ConfirmDialog`** — modal for destructive actions (Approve, Suspend, Refund, Mark Failed); wired across all 4 admin pages. Mark Failed dialog includes failure reason input slot.
- ~~`WalletCard`, `TransactionRow`, `VendorStatusBadge`~~ — decided against extracting; inline rendering is fine at this scale.

> **Also added to AdminShell:** Vendors nav item (with pending badge).  
> **Also updated `data.ts`:** `Order` gained `paymentMethod` + `placedBy` + `failureReason`; added `WalletTransaction`, `Vendor` types + mock data (`SAMPLE_WALLET_TRANSACTIONS`, `SAMPLE_VENDORS`, `VENDOR_WALLET_BALANCE`).

---

## Phase 2 — Backend (after UI is complete)

High-level only — will be detailed when we get here.

### 2A — Database layer
- [x] Mongoose connection (`src/lib/mongo.ts`) — cached global connection
- [x] Models: `Bundle`, `Order`, `WalletTransaction`, `WalletTopup`, `PaymentEvent` — all amounts in pesewas (integer); enums lowercase
- [x] Model: `User` (`src/lib/models/user.ts`) — vendor + admin unified; role, status, walletBalance
- [x] Seed script: admin account from env vars, sample bundles

### 2B — Auth
- [x] `POST /api/v1/auth/login` — bcrypt verify via `Bun.password`, sets httpOnly cookie (JWT, 7d), role-based redirect in client; returns `user` payload (no token in body)
- [x] `POST /api/v1/auth/signup` — creates vendor with PENDING status
- [x] `src/lib/jwt.ts` — migrated to `jose`; `generateToken` (async, 7d expiry), `verifyToken` (async, returns `null` on failure); `TokenPayload` type (`_id`, `email`, `role`, `status`, `businessName`)
- [x] `src/stores/auth.ts` — Zustand store, sessionStorage-backed; `setUser` / `clearUser`
- [x] `GET /api/v1/auth/me` — reads cookie, returns fresh user from DB (walletBalance, businessName, role, status)
- [x] `src/lib/get-auth-user.ts` — shared helper: reads `auth_token` cookie, returns verified JWT payload
- [x] `POST /api/v1/auth/logout` — deletes `auth_token` cookie; both shells call it + clear Zustand on sign out
- [x] `src/proxy.ts` — role gate: `/admin/*` requires admin, `/vendor/*` requires approved vendor, `/pending` for pending vendor; bounces logged-in users away from `/login` + `/signup`

### 2C — Bundle catalog
- [x] `GET /api/v1/bundles` — public, no auth; returns active bundles with derived GB names + validity strings; optional `?network=` filter

### 2D — Orders
- [x] `POST /api/v1/orders/guest` — creates order (status: `pending_payment`, method: `paystack`); returns reference + paystackUrl stub
- [x] `POST /api/v1/orders/vendor` — atomic wallet debit (balance guard); creates order (status: `paid`, method: `wallet`) + WalletTransaction; compensates on order failure
- [x] `GET /api/v1/orders/lookup` — status lookup by reference; returns status, snapshots, validityDays (populated from bundle), phone, amount

### 2E — Paystack
- [x] `src/lib/paystack.ts` — `initializeTransaction`, `verifyTransaction`, `verifyWebhookSignature`, `generateTopupReference`
- [x] `POST /api/v1/vendor/wallet/topup` — creates WalletTopup (TP-prefixed ref), calls Paystack init, returns `paystackUrl`
- [x] `POST /api/v1/paystack/webhook` — HMAC-SHA512 verify, idempotent via PaymentEvent (`data.id`), handles `charge.success` for orders + topups
- [x] `POST /api/v1/admin/orders/[id]/verify` — Paystack re-verify; updates order to `paid` if confirmed

### 2F — Admin API
- [x] `GET /api/v1/admin/dashboard` — pendingOrdersCount, todayRevenue, ordersToday, allTimeRevenue, revenueChart (7d/30d/all), pendingQueue (top 3 oldest paid), todayByNetwork (mtn/telecel/airteltigo), pendingVendorsCount
- [x] `GET /api/v1/admin/orders` — paginated; filters: status, network, paymentMethod, dateRange (createdAt), search; populates placedBy→businessName; returns per-status counts
- [x] `GET /api/v1/admin/orders/[id]` — full order detail with populated vendor, completedBy, failedBy
- [x] `PATCH /api/v1/admin/orders/[id]/complete` — guard: status must be `paid`; sets completed + timestamps
- [x] `PATCH /api/v1/admin/orders/[id]/fail` — guard: status must be `paid`; requires failureReason; sets failed + timestamps
- [x] `PATCH /api/v1/admin/orders/[id]/refund` — guard: failed + wallet + placedBy not null + refundedAt null; atomic wallet credit + WalletTransaction (refund); idempotent via `refundedAt`
- [x] `GET /api/v1/admin/vendors` — list vendors; filters: status, search; includes per-tab counts
- [x] `GET /api/v1/admin/vendors/[id]` — vendor detail + recent wallet txns (10) + recent orders (10)
- [x] `PATCH /api/v1/admin/vendors/[id]` — action: approve/suspend/reactivate; sets status + timestamps + performedBy
- [x] `POST /api/v1/admin/vendors/[id]/wallet-adjustment` — body: amountGhs (pesewas), note; atomic balance update + WalletTransaction (adjustment)
- [x] `GET /api/v1/admin/bundles` — active bundles only; optional network filter; per-network counts; name derived from volumeMb (always GB)
- [x] `POST /api/v1/admin/bundles` — create bundle; admin enters GB value (frontend multiplies ×1024 → volumeMb); name auto-derived as "X GB"
- [x] `PATCH /api/v1/admin/bundles/[id]` — update price only (priceGhs pesewas)
- [x] `PATCH /api/v1/admin/bundles/[id]/archive` — soft-delete: sets archivedAt + archivedBy
- [ ] `POST /api/v1/admin/orders/[id]/verify` — Paystack re-verify (not yet implemented)

### 2G — Vendor API
- [x] `GET /api/v1/vendor/dashboard` — walletBalance, spentThisMonth (pesewas), monthlyOrderCount, pendingOrdersCount, last 5 orders
- [x] `GET /api/v1/vendor/orders` — paginated (page, limit=20); filters: status, paymentMethod, search (reference/phone regex); returns orders + total + totalPages
- [x] `POST /api/v1/vendor/wallet/topup` — create WalletTopup, initialize Paystack, return `paystackUrl`
- [x] `GET /api/v1/vendor/wallet/transactions` — paginated ledger for authenticated vendor

### 2H — Rate limiting
- [x] `/api/auth/login`: 5 attempts / 15 min / IP
- [x] `/api/auth/signup`: 3 / hour / IP

---

## Route inventory (final state)

### Public
| Route | Purpose | UI Status |
|---|---|---|
| `/` | Homepage + order lookup | Done |
| `/networks` | Pick network | Done |
| `/bundles/[network]` | Pick bundle | Done |
| `/checkout` | Confirm + pay (guest) | Done |
| `/checkout/paystack` | Paystack handoff | Done |
| `/checkout/success` | Confirmation | Done |
| `/order-status` | Lookup form | Done |
| `/order-status/[ref]` | Status result | Done |

### Auth
| Route | Purpose | UI Status |
|---|---|---|
| `/login` | Vendor + admin login | Done |
| `/signup` | Vendor self-signup | Done |
| `/pending` | Pending approval page | Done |

### Vendor console
| Route | Purpose | UI Status |
|---|---|---|
| `/vendor/dashboard` | Vendor home | Done |
| `/vendor/orders` | Order history | Done |
| `/vendor/wallet` | Wallet + top-up | Done |
| `/vendor/settings` | Profile + password | Done |

### Admin console
| Route | Purpose | UI Status |
|---|---|---|
| `/admin/dashboard` | Stats + pending queue | Done |
| `/admin/orders` | Orders table | Done (updated) |
| `/admin/orders/[id]` | Order detail | Done (updated) |
| `/admin/bundles` | Bundle CRUD | Done |
| `/admin/vendors` | Vendors list | Done |
| `/admin/vendors/[id]` | Vendor detail | Done |

**Removed:** `/admin/login` → redirects to `/login`  
**Removed:** `/dashboard` → redirects to `/vendor/dashboard`

---

## Notes

- All console pages (admin + vendor) fully wired to real APIs. All remaining items complete.
- Keep `PROGRESS.md` as component/design system reference.
- Bundle name is auto-derived from `volumeMb` via `src/lib/bundle-name.ts`; not stored separately.
- Paystack webhook must be registered at `{domain}/api/v1/paystack/webhook` with `charge.success` event enabled.
- Required env vars: `MONGO_URI`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.
- `NetMark` accepts `xs` (24px) / `sm` (36px) / `md` (56px) / `lg` (72px). Always pass network in uppercase.
