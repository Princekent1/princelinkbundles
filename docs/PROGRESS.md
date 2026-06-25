# Bundle Hub — Progress

## Stack
- Next.js 16.2.4 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- Bun runtime

## What's done

### Design system
- `src/app/globals.css` — design tokens as CSS custom properties: ink-50→900 neutrals, brand-50→600 (electric violet), accent-500 (warm orange), network colors, status colors, shadows
- `src/app/layout.tsx` — fonts wired via next/font/google: Inter (body `--font-inter`), Space Grotesk (display `--font-space-grotesk`), JetBrains Mono (mono `--font-jetbrains-mono`)
- `.bh-display` (Space Grotesk 700), `.bh-mono` (JetBrains Mono), `.bh-card` (white bordered card), `.bh-input` (form input with focus ring) utility classes

### Shared components
| File | What it does |
|------|-------------|
| `src/lib/data.ts` | NETWORKS, BUNDLES, SAMPLE_ORDERS, SAMPLE_VENDORS, SAMPLE_WALLET_TRANSACTIONS, VENDOR_WALLET_BALANCE + types (Order, Bundle, WalletTransaction, Vendor) + helpers (`ghs`, `getNetwork`) |
| `src/components/ui/icons.tsx` | 24 mono-line SVG icons: arrow-left/right, check, shield, bolt, phone, search, user, logout, dashboard, package, list, settings, plus, ext, info, lock, wallet, trend, menu, x, copy, filter |
| `src/components/ui/wordmark.tsx` | BundleHub logotype with violet accent dot |
| `src/components/ui/network-icons.tsx` | Real telco SVGs — MTN wordmark, Telecel, AirtelTigo |
| `src/components/ui/network-mark.tsx` | `NetMark` (xs/sm/md/lg square logo tile) + `NetChip` (colored pill label) |
| `src/components/ui/status-badge.tsx` | `StatusBadge` — Pending / Paid / Completed / Failed / Cancelled |
| `src/components/admin/shell.tsx` | Admin sidebar shell — nav (Dashboard, Orders, Vendors, Bundles), active-route highlighting, pending badge, user footer |
| `src/components/vendor/shell.tsx` | Vendor sidebar shell — nav (Dashboard, Orders, Wallet, Settings), wallet balance card, user footer + logout |

### Routes

#### Public / guest flow
| Route | Screen |
|-------|--------|
| `/` | Landing — fully responsive; hero 1-col mobile → 2-col desktop; diagonal 3×3 network card preview (desktop only, `hidden lg:block`); how-it-works 2-col mobile → 4-col desktop |
| `/networks` | Pick network — logo, bundle count, min price |
| `/bundles/[network]` | Pick bundle — radio cards with volume/validity/price + sticky CTA |
| `/checkout` | Confirm & pay — order summary, phone/email form, Paystack CTA |
| `/checkout/paystack` | Paystack handoff placeholder |
| `/checkout/success` | Confirmation — copyable reference, order details |
| `/order-status` | Lookup — phone + reference form |
| `/order-status/[ref]` | Status result — pipeline + order details |

#### Auth
| Route | Screen |
|-------|--------|
| `/login` | Single form — email + password; link to `/signup`; guest escape; role-based redirect to `/admin/dashboard` or `/vendor/dashboard` |
| `/signup` | Vendor self-signup — business name, email, phone, password, confirm; submit → `/pending` |
| `/pending` | "Application under review" — what-happens-next steps, contact note, back to sign in |

#### Vendor console
| Route | Screen |
|-------|--------|
| `/vendor/dashboard` | Stats (balance, spent, pending), quick-buy network grid, recent orders table |
| `/vendor/orders` | Orders table — status + payment method filters, search, WALLET/PAYSTACK badges |
| `/vendor/wallet` | Balance hero, top-up panel (presets + custom + Paystack CTA), transaction history |
| `/vendor/settings` | Read-only profile, change password form, sign out |

#### Admin console
| Route | Screen |
|-------|--------|
| `/admin/dashboard` | Stats grid (4), revenue chart, pending queue preview, network breakdown |
| `/admin/orders` | Orders table — status tabs, network/payment/date filters, Vendor + Payment Method columns, "Mark done" per row |
| `/admin/orders/[id]` | Order detail — send-to card, Mark Complete + Mark Failed (with reason) + wallet refund (conditional), payment method/vendor rows, activity log, Paystack verify |
| `/admin/bundles` | Bundle catalog — network tabs, Edit/Archive actions |
| `/admin/vendors` | Vendors table — status filter tabs, search, inline Approve/Suspend/Reactivate, link to detail |
| `/admin/vendors/[id]` | Vendor detail — status + contextual actions, wallet adjustment (amount + required note), wallet history, orders placed |

#### Redirects
| Route | Redirects to |
|-------|-------------|
| `/dashboard` | `/vendor/dashboard` |
| `/admin/login` | `/login` |

### Backend (Phase 2 — in progress)

| File | What it does |
|------|-------------|
| `src/lib/mongo.ts` | Cached Mongoose connection; `global._mongoose` pattern; throws on missing `MONGO_URI` |
| `src/lib/models/user.ts` | `User` model — unified vendor + admin; `walletBalance` in pesewas; enums lowercase; `suspendedAt` + `suspendedBy` added |
| `src/lib/models/bundle.ts` | `Bundle` model — network, volumeMb, validityDays, `priceGhs` (pesewas), sortOrder, soft-archive |
| `src/lib/models/order.ts` | `Order` model — reference (6-char base62), placedBy (null = guest), paymentMethod, snapshots, `amountGhs` (pesewas), status lifecycle; `refundedAt` added for idempotency guard |
| `src/lib/models/wallet-transaction.ts` | Append-only ledger — `amountGhs` + `balanceAfter` (pesewas); `updatedAt` disabled |
| `src/lib/models/wallet-topup.ts` | Wallet top-up attempts — separate from orders; indexed on `paystackReference` for webhook lookup |
| `src/lib/models/payment-event.ts` | Append-only Paystack webhook log — `paystackEventId` unique for idempotency; `timestamps: false` |
| `src/lib/jwt.ts` | `jose`-backed; `generateToken` (async, HS256, 7d), `verifyToken` (async, returns `null` on failure) |
| `src/lib/get-auth-user.ts` | Reads `auth_token` cookie, returns verified JWT payload or null — shared across protected routes |
| `src/lib/errors.ts` | `createErrorResponse` — maps error keys to status + message + details; includes `Unauthorized`, `Forbidden` |
| `src/lib/omit.ts` | Generic `omit<T, K>` utility |
| `src/lib/bundle-name.ts` | `deriveBundleName(volumeMb)` — 1024→"1 GB", 500→"500 MB"; used by bundle API routes and frontend |
| `src/api/index.ts` | Axios client; all admin + vendor typed fns: orders (list, detail, complete, fail, refund), vendors (list, detail, status, adjustment), bundles (list, create, updatePrice, archive) |
| `src/stores/auth.ts` | Zustand auth store — `user: TokenPayload \| null`, `setUser`, `clearUser`; persisted to `sessionStorage` |
| `src/providers/AppProvider.tsx` | `QueryClient` instantiated outside component; wraps `QueryClientProvider` + `Toaster` |
| `src/app/api/v1/auth/login/route.ts` | POST — bcrypt verify, sets `auth_token` httpOnly cookie (7d, secure in prod), returns `{ user: TokenPayload }` |
| `src/app/api/v1/auth/signup/route.ts` | POST — validates + dedupes email/phone, hashes password (bcrypt cost 8), creates vendor with PENDING status |
| `src/app/api/v1/auth/me/route.ts` | GET — verifies cookie, returns fresh user from DB (walletBalance, businessName, role, status) |
| `src/app/api/v1/vendor/dashboard/route.ts` | GET — parallel aggregation: walletBalance, spentThisMonth + count (pesewas), pendingOrdersCount, last 5 orders |
| `src/app/api/v1/vendor/orders/route.ts` | GET — server-side paginated orders for authenticated vendor; filters: status (maps display→DB enum), paymentMethod, regex search on reference + customerPhone; returns orders + total + page + totalPages |
| `src/app/api/v1/bundles/route.ts` | GET — public, no auth; active bundles with derived GB names + validity strings; optional `?network=` filter |
| `src/app/api/v1/orders/guest/route.ts` | POST — creates order (status: `pending_payment`, paymentMethod: `paystack`); returns reference + paystackUrl stub |
| `src/app/api/v1/orders/vendor/route.ts` | POST — auth required (approved vendor); atomic wallet debit with balance guard; creates order (status: `paid`) + WalletTransaction; compensating credit on order failure |
| `src/app/api/v1/auth/logout/route.ts` | POST — deletes `auth_token` httpOnly cookie |
| `src/app/api/v1/admin/dashboard/route.ts` | GET — 8 parallel aggregations: pendingOrdersCount, todayRevenue, ordersToday, allTimeRevenue, revenueChart (period: 7d/30d/all), pendingQueue (top 3 oldest paid orders), todayByNetwork (mtn/telecel/airteltigo), pendingVendorsCount; admin-only |
| `src/app/api/v1/admin/orders/route.ts` | GET — paginated orders; filters: status, network, paymentMethod, dateRange (createdAt), search; populates placedBy→businessName; returns per-status counts |
| `src/app/api/v1/admin/orders/[id]/route.ts` | GET — full order detail; populates vendor, completedBy, failedBy |
| `src/app/api/v1/admin/orders/[id]/complete/route.ts` | PATCH — guard status=paid; sets completed + timestamps |
| `src/app/api/v1/admin/orders/[id]/fail/route.ts` | PATCH — guard status=paid; requires failureReason; returns canRefund flag |
| `src/app/api/v1/admin/orders/[id]/refund/route.ts` | PATCH — guard failed+wallet+vendor+!refundedAt; atomic walletBalance inc + WalletTransaction (refund) |
| `src/app/api/v1/admin/vendors/route.ts` | GET — vendor list; filters: status, search; per-tab counts |
| `src/app/api/v1/admin/vendors/[id]/route.ts` | GET + PATCH — detail (vendor+txns+orders) / status action (approve/suspend/reactivate) with timestamps |
| `src/app/api/v1/admin/vendors/[id]/wallet-adjustment/route.ts` | POST — amountGhs (pesewas) + note; atomic balance update + WalletTransaction (adjustment) |
| `src/app/api/v1/admin/bundles/route.ts` | GET + POST — active bundles with derived names + per-network counts / create bundle |
| `src/app/api/v1/admin/bundles/[id]/route.ts` | PATCH — update priceGhs only |
| `src/app/api/v1/admin/bundles/[id]/archive/route.ts` | PATCH — soft archive: archivedAt + archivedBy |
| `src/app/api/v1/admin/nav-counts/route.ts` | GET — admin-only; parallel count of `paid` orders + `pending` vendors for shell badges |
| `src/lib/rate-limit.ts` | In-memory `Map`-based rate limiter; `loginLimiter` (5/15min/IP), `signupLimiter` (3/hr/IP); `getIp` helper |
| `src/proxy.ts` | Route protection (Next.js 16 Proxy, replaces `middleware.ts`): `/admin/*` → admin only, `/vendor/*` → approved vendor only, `/pending` → pending vendor only; `/login`+`/signup` redirect logged-in users to their dashboard |
| `src/app/(auth)/login/page.tsx` | Hydrates Zustand on success; role-based redirect (`admin` → `/admin/dashboard`, vendor → `/vendor/dashboard`) |
| `src/app/vendor/dashboard/page.tsx` | Client component — parallel `useQuery` for `/me` + `/vendor/dashboard`; real greeting, stats, recent orders |
| `src/app/vendor/orders/page.tsx` | URL-driven filters (status, paymentMethod, search, page) via searchParams + router.replace; search fires on button click or Enter; pagination prev/next renders only when totalPages > 1 |
| `src/app/admin/dashboard/page.tsx` | Client component — useQuery for `/me` + `/admin/dashboard`; real greeting + date; period selector (7d/30d/all) switches chart query; skeleton loading on chart, queue, network cards |
| `src/app/admin/orders/page.tsx` | URL-driven filters (status, network, paymentMethod, dateRange, search, page); per-status counts in tabs; inline mark done (paid only); skeleton loading |
| `src/app/admin/orders/[id]/page.tsx` | Real fetch; mark complete/fail/refund mutations wired; activity log from real timestamps; refund banner shows only when eligible; verify button disabled unless order is `pending_payment` + paystack |
| `src/app/admin/vendors/page.tsx` | URL-driven status + search; approve/suspend/reactivate mutations; per-tab counts from API |
| `src/app/admin/vendors/[id]/page.tsx` | Real fetch; wallet adjustment (pesewas input with GHS preview); status actions wired with optimistic invalidation |
| `src/app/admin/bundles/page.tsx` | Real data; create modal — volume input in GB (multiplies ×1024 before API call), live "X GB" name preview; edit-price modal; archive confirm dialog |
| `src/app/networks/page.tsx` | Real data — fetches `GET /api/v1/bundles`, derives per-network count + min price |
| `src/app/bundles/[network]/page.tsx` | Real data — fetches bundles for the selected network; skeleton loading |
| `src/app/checkout/page.tsx` | Real data + order creation — detects vendor vs guest via `/me`; vendor sees wallet balance + affordability check, posts to `/api/v1/orders/vendor`; guest posts to `/api/v1/orders/guest` → Paystack stub |
| `src/app/checkout/success/page.tsx` | Reads order details from URL params (ref, network, bundle, validity, phone, amount) |

### Architecture decisions (resolved)
- **Token storage:** JWT in httpOnly cookie (not localStorage) — XSS-safe
- **Session strategy:** stateless JWT (not `sessions` collection) — simpler, no TTL-index maintenance
- **JWT library:** `jose` (not `jsonwebtoken`) — async API, works in Node.js and edge runtimes
- **Route protection:** `src/proxy.ts` (Next.js 16 Proxy convention, was `middleware.ts`) — Node.js runtime by default
- **Pending vendor flow:** login issues cookie for pending vendors; proxy redirects them to `/pending`; rejected/suspended blocked at login
- **Client state:** Zustand + sessionStorage for user display info; cleared on tab close
- **Payload:** only `_id`, `email`, `role`, `status`, `businessName` in token — no mongoose internals
- **Bundle naming:** always "X GB" — admin enters GB value; frontend multiplies ×1024 before API; `deriveBundleName(volumeMb)` = `${volumeMb/1024} GB`. No MB display anywhere
- **Networks:** mtn / telecel / airteltigo only (matches DB enum); ISHARE + BIGTIME removed
- **Money storage:** all amounts as integers in pesewas (100 pesewas = GHS 1); `ghsp()` helper for display
- **DB enums:** all lowercase (`mtn`, `paystack`, `pending_payment`, etc.); `StatusBadge` normalizes with `.toUpperCase()` for display

## What's not done yet
- ~~Seed script: admin account + sample bundles~~ ✓
- ~~Order lookup API~~ ✓ — `GET /api/v1/orders/lookup`; `/checkout/success` now fetches from it
- ~~Paystack integration~~ ✓ — `src/lib/paystack.ts`; guest order init calls Paystack; webhook handles orders + topups; `/vendor/wallet` wired
- ~~`POST /api/v1/admin/orders/[id]/verify`~~ ✓ — verify button wired on order detail page
- ~~Vendor wallet topup + transaction history API~~ ✓ — `POST /api/v1/vendor/wallet/topup`, `GET /api/v1/vendor/wallet/transactions`
- ~~Admin shell nav badges~~ ✓ — `GET /api/v1/admin/nav-counts`; `AdminShell` polls with 60s stale time; badges hide when zero
- ~~Rate limiting~~ ✓ — `src/lib/rate-limit.ts`; login 5/15min/IP, signup 3/hr/IP; returns 429
- Environment variables (`.env.local`) — need `MONGO_URI`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`

## Everything complete

## Design ideas (deferred)
- **Landing page network cards animation:** cards are laid out diagonally (MTN top-left, Telecel center, AirtelTigo bottom-right) in a 3×3 CSS grid (9-cell explicit layout — 3 filled, 6 empty). Future idea: animate them to drift across the container in an alternating pattern (each card moves along its diagonal axis, looping). Consider CSS `@keyframes` with `translate` on each card, staggered delays, so they feel like they're floating in place.

## Open decisions
- Order reference prefix: raw `7K9M2A` vs branded `BH-7K9M2A` (display only, store raw)
- Case sensitivity on order lookup: strict base62 (current) vs case-insensitive base36 fallback
- Abandoned order cleanup: cron after 24h marking `PENDING_PAYMENT` → `CANCELLED` (optional for v1)
