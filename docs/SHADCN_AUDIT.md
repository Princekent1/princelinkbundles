# shadcn/ui Compliance Audit

Convention: shadcn primitives as the base for all UI. Styled with Tailwind + project design tokens. No raw div-soup where a shadcn component exists.

shadcn initialized (`radix-nova` style, `components.json` present). **No components installed yet.**

---

## Step 0 — Install components ✅

```bash
bunx shadcn@latest add button input select table card badge tabs dialog separator label
```

- [x] `button`
- [x] `input`
- [x] `select`
- [x] `table`
- [x] `card`
- [x] `badge`
- [x] `tabs`
- [x] `dialog`
- [x] `separator`
- [x] `label`

---

## Audit by file

### Shared components

| File | Issues | Status |
|------|--------|--------|
| `src/components/admin/shell.tsx` | Nav items are `<Link>` — no Button needed | ✅ |
| `src/components/vendor/shell.tsx` | Nav items are `<Link>` — no Button needed | ✅ |
| `src/components/ui/button.tsx` | Already shadcn CVA pattern, skipped overwrite | ✅ |
| `src/components/ui/status-badge.tsx` | Rebuilt on shadcn `Badge` | ✅ |

---

### Public / guest flow

| File | Issues | Status |
|------|--------|--------|
| `src/app/page.tsx` | `Button`, `Badge`, `Card` | ✅ |
| `src/app/networks/page.tsx` | `Card` for info panel | ✅ |
| `src/app/bundles/[network]/page.tsx` | `Button`, `Badge` | ✅ |
| `src/app/checkout/page.tsx` | `Button`, `Input`, `Label`, `Card` | ✅ |
| `src/app/checkout/paystack/page.tsx` | `Button asChild` | ✅ |
| `src/app/checkout/success/page.tsx` | `Button`, `Button asChild` | ✅ |
| `src/app/order-status/page.tsx` | `Button`, `Input`, `Label`, `Card` | ✅ |
| `src/app/order-status/[ref]/page.tsx` | `Button asChild`, `Button variant="ghost" asChild` | ✅ |

---

### Auth

| File | Issues | Status |
|------|--------|--------|
| `src/app/login/page.tsx` | `Button`, `Input`, `Label`, `Card` | ✅ |
| `src/app/signup/page.tsx` | `Button`, `Input`, `Label` | ✅ |
| `src/app/pending/page.tsx` | `Button`, `Card` | ✅ |

---

### Vendor console

| File | Issues | Status |
|------|--------|--------|
| `src/app/vendor/dashboard/page.tsx` | `Card`, `Table` | ✅ |
| `src/app/vendor/orders/page.tsx` | `Button`, `Input`, `Badge`, `Card`, `Table` | ✅ |
| `src/app/vendor/wallet/page.tsx` | `Button`, `Input`, `Label`, `Badge`, `Card`, `Table` | ✅ |
| `src/app/vendor/settings/page.tsx` | `Button`, `Input`, `Label`, `Card` | ✅ |

---

### Admin console

| File | Issues | Status |
|------|--------|--------|
| `src/app/admin/dashboard/page.tsx` | `Button`, `Card` | ✅ |
| `src/app/admin/orders/page.tsx` | `Button`, `Input`, `Select`, `Badge`, `Card`, `Table` | ✅ |
| `src/app/admin/orders/[id]/page.tsx` | `Button`, `Input`, `Label`, `Badge`, `Card` | ✅ |
| `src/app/admin/bundles/page.tsx` | `Button`, `Badge`, `Card`, `Table` | ✅ |
| `src/app/admin/vendors/page.tsx` | `Button`, `Input`, `Badge`, `Card`, `Table` | ✅ |
| `src/app/admin/vendors/[id]/page.tsx` | `Button`, `Input`, `Label`, `Badge`, `Card` | ✅ |

---

## Priority order

1. **Install components** (Step 0)
2. **High — interactive elements**: `Button`, `Input`, `Select` replacements across all forms + tables
3. **High — tables**: All `<table>` → shadcn `Table` (admin/vendor)
4. **Medium — cards**: Stat cards, detail cards → shadcn `Card`
5. **Medium — tabs**: Filter tabs → shadcn `Tabs`
6. **Medium — badges**: Status/payment badges → shadcn `Badge`
7. **Low — shells**: Nav + logout buttons in admin/vendor shells
8. **ConfirmDialog** — build with shadcn `Dialog` (completes PLAN.md 1E)

---

## Notes

- Project design tokens live in `globals.css` as CSS custom properties (`--brand-*`, `--ink-*`, `--accent-*`). shadcn components should be styled using these via Tailwind.
- `status-badge.tsx` and `button.tsx` are custom — will be replaced/rebuilt on shadcn base.
- Do files one route at a time to keep diffs reviewable.
