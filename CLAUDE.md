# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses Next.js **16.x** — a version with breaking changes from typical training data. Before writing any Next.js-specific code (routing, middleware, config, caching), read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Commands

```bash
bun dev        # start dev server
bun build      # production build
bun start      # run production build
```

No test runner or linter is configured.

## Stack

- **Runtime**: Bun
- **Framework**: Next.js 16 App Router
- **UI**: React 19 + shadcn (Radix Nova) + Tailwind CSS v4
- **Forms**: React Hook Form + Zod v4
- **Server state**: TanStack Query v5
- **Client state**: Zustand v5 (auth only)
- **Database**: MongoDB via Mongoose 9
- **Auth**: JWT (jose) in HTTP-only cookies
- **Payments**: Paystack (processor) + Jaybart (telecom fulfillment API)

## What this app is

**EazyData** — a mobile data bundle marketplace for Ghana. Three actor types:

- **Guest**: buys bundles anonymously via Paystack checkout
- **Vendor**: registered reseller; buys via wallet balance; wallet topped up via Paystack
- **Admin**: manages bundles, orders, vendors, settings

Guest order flow: checkout → Paystack payment → webhook → auto-fulfill via Jaybart API → order status page.

## Monetary amounts

All monetary values are stored and passed as **pesewas** (GHS × 100). The `amountGhs` field name is misleading — it actually holds pesewas. Comments in models confirm this.

## Directory layout

```
src/
  app/
    (auth)/           # login + signup pages
    admin/            # admin dashboard, bundles, orders, vendors, settings
    vendor/           # vendor dashboard
    checkout/         # guest checkout flow
    order-status/[ref]/
    api/v1/           # all REST endpoints (see below)
  components/
    ui/               # shadcn primitives
    admin/            # admin-specific components
    vendor/           # vendor-specific components
  lib/
    models/           # Mongoose schemas: user, bundle, order, wallet-topup, wallet-transaction, payment-event, settings
    payment/          # Paystack + Jaybart integration
    auto-send.ts      # auto-fulfill logic (called from webhook)
    get-auth-user.ts  # extract + verify JWT from request cookies
    jwt.ts            # sign/verify helpers
    mongo.ts          # cached Mongoose connection
    rate-limit.ts     # in-memory rate limiter
    errors.ts         # shared error types
  api/                # client-side API call wrappers (axios)
  stores/             # Zustand stores (auth)
  providers/          # ReactQueryProvider + auth hydration
  types/              # shared TS types
```

## API route structure

All routes live under `src/app/api/v1/`. Key groups:

| Prefix | Description |
|--------|-------------|
| `auth/` | login, logout, me, signup, password |
| `bundles` | public bundle listing |
| `orders/guest` | guest order creation |
| `orders/vendor` | vendor order creation (wallet debit) |
| `orders/lookup` | guest order status lookup by reference |
| `paystack/webhook` | Paystack event handler (HMAC-verified) |
| `vendor/wallet/` | topup initiation + transaction history |
| `admin/bundles/` | CRUD + archive |
| `admin/orders/[id]/` | complete, fail, refund, verify |
| `admin/vendors/` | list, approve, suspend, wallet adjustment |
| `admin/jaybart/` | fetch packages from Jaybart, sync to DB |

## Auth pattern

`get-auth-user.ts` reads the JWT cookie and returns the decoded user payload. Admin routes check `role === "admin"`, vendor routes check `role === "vendor"` and `status === "approved"`.

## Key data model notes

- `Order.reference` — unique 8-char alphanumeric, used for guest status lookups; guest refs must **not** start with `"TP"` (reserved for Paystack references)
- `Order.amountGhs` — stored in pesewas despite the name
- `Bundle` prices — also pesewas
- `User.walletBalance` — pesewas
- `PaymentEvent` — idempotency table for Paystack webhooks; prevents double-processing

## Payment/fulfillment flow

1. Order created with status `pending_payment`
2. Paystack webhook fires → `payment-event` idempotency check → mark order `paid`
3. `auto-send.ts` called → calls Jaybart API → order moves to `fulfilling` → `completed` or `failed`
4. Admin can manually complete/fail/refund orders

Jaybart's catalog `volume` is in decimal MB (e.g. `1000` = 1GB) and is sent directly as the `shared_bundle` field. The DB `volumeMb` is binary (1024 = 1GB), so the package-sync route converts via `(volume / 1000) * 1024` to match. Network IDs are resolved from the `Settings` model at fulfillment time.
