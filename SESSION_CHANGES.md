# Session Changes — 2026-05-20

## 1. Order detail page (`src/app/admin/orders/[id]/page.tsx`)
- `doComplete` `onError` now shows the specific Jaybart error message instead of a generic one
- Added unfulfillable warning banner: when order is `paid` and `jaybartPackageId === null`, shows a warning with a link to the Bundle Catalog to map the bundle first
- `jaybartTransactionCode` now shows in the activity timeline for completed orders (appended to the "Marked as completed" entry)
- Updated ConfirmDialog description for complete to mention Jaybart

## 2. TypeScript fix (`src/app/api/v1/admin/orders/[id]/route.ts`)
- Chained `.populate()` calls were confusing Mongoose's type inference → cast result to `any` after `.lean()`

## 3. Bundle management simplification
### `src/api/index.ts`
- Replaced `updateBundlePrice` + `updateBundleJaybartPackage` with a single `updateBundle(id, { priceGhs?, jaybartPackageId? })`
- Removed `syncJaybartPackages` (no longer used)

### `src/app/admin/bundles/page.tsx` (full rewrite)
- Removed "Sync Jaybart" button
- Removed per-row "Map" button and its separate dialog
- **Edit dialog** now handles both price AND Jaybart package mapping in one place
  - Jaybart package dropdown filtered by the bundle's network, pre-populated with current mapping
  - "— No mapping" option to clear the mapping
- **Create dialog** Jaybart package select filtered by selected network (unchanged from before)
- Jaybart packages fetched lazily when create or edit dialog opens (`staleTime: 5min`)

## 4. Auto-approve vendors toggle
### `src/lib/models/settings.ts`
- Added `autoApproveVendors: boolean` field (schema default: `false`)
- Updated `getSettings()` fallback to include it

### `src/app/api/v1/admin/settings/route.ts`
- GET now returns `autoApproveVendors`
- PATCH now accepts and saves `autoApproveVendors`

### `src/app/api/v1/auth/signup/route.ts`
- On vendor signup, calls `getSettings()` — if `autoApproveVendors` is true, creates user with `status: "approved"` and `approvedAt: new Date()` immediately

### `src/api/index.ts`
- Added `autoApproveVendors` to `FulfillmentSettings` type
- Updated `updateFulfillmentSettings` to accept it

### `src/app/admin/settings/page.tsx`
- New "Vendors" card (between Fulfillment and Profile) with "Auto-approve registrations" toggle

## 5. WhatsApp community link
### `src/components/ui/icons.tsx`
- Added `whatsapp` icon case using the official brand SVG (green gradient, multi-path)

### `src/components/admin/shell.tsx` + `src/components/vendor/shell.tsx`
- Added "Join community" link above the user footer in both sidebars
- Opens `https://chat.whatsapp.com/KC7CFZlNjR79JerZooYG1N` in a new tab
- Styled with `--ink-50` background, `--ink-700` text, external link arrow icon

## 6. Brand color update (EazyData logo colors)
### `src/app/globals.css`
- `--ink-900`: `#08214F` (logo deep navy — drives primary buttons, active nav)
- `--ink-800`: `#0C2A64` (hover state for deep navy buttons)
- `--ink-700`: `#2A3554` (kept neutral for labels/body text)
- `--brand-500`: `#0CADFA` (logo light blue — focus rings, toggles, CTAs)
- `--brand-600`: `#0899E0` (hover on light blue)
- `--brand-400`: `#3DBDFB`
- `--brand-100`: `#DCF3FF`
- `--brand-50`: `#F0FAFF`
- `--primary`: `#0CADFA`
- `--primary-foreground`: `#ffffff` (must be white — dark buttons inherit this as text color)
- `--ring`: `#0CADFA`

### Gradients updated (violet → brand pair)
- `src/components/vendor/shell.tsx` — wallet card gradient: `brand-500 → ink-900`
- `src/app/checkout/success/page.tsx` — success gradient: `brand-500 → ink-900`
- `src/app/vendor/wallet/page.tsx` — wallet gradient: `brand-500 → ink-900`

## 7. Bug fix: invisible button text
- Root cause: `--primary-foreground` was set to `#08214F` (dark navy), so buttons overriding bg with `bg-[var(--ink-900)]` inherited dark text on dark background
- Fix: `--primary-foreground: #ffffff`

---

## Uncommitted changes at end of session
All changes above are **unstaged/uncommitted**. Run:
```bash
git add -A
git commit -m "feat: Jaybart fulfillment, auto-approve vendors, brand colors, community link"
```
