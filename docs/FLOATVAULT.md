# FloatVault payment provider

Prince K can take payments through FloatVault as a second `paymentMode` beside Paystack, using FloatVault's hosted checkout. Paystack is unchanged while the mode is `paystack` (the default). The same integration exists in uncle-ebo; the decision records live in the payments workspace (`payments/docs/adr/0027-hosted-checkout-rebuild.md`, `0022`, `0029`).

Branch: `feature/floatvault-provider` (not pushed).

## How it works

- **Switch.** Admin → Settings → Payments → Payment provider (Paystack or FloatVault). It applies to guest checkout, vendor wallet top-ups and the vendor signup fee together. Wallet-paid bundle orders are unaffected.
- **Charge.** The app creates the payment with `POST /payments` (amount, `callbackUrl`, metadata) and no network or number, then sends the customer to the `checkoutUrl` FloatVault returns. FloatVault's page collects the network and number, handles any one-time code and retries, then redirects back to `/checkout/success?ref=<order>`, `/vendor/wallet?topup=success&ref=<topup>` or `/vendor/signup-fee?fee=success&ref=<fee>`. The redirect only affects the customer's screen; settlement comes from the webhook or the polling fallback.
- **Confirmation.** Webhook first (`POST /api/v1/floatvault/webhook`, HMAC-SHA256 over the raw body, header `x-floatvault-signature`). The order lookup, top-up verify and signup-fee verify routes also call `GET /payments/:reference`, so a payment settles without a public webhook URL (local dev) or after a missed webhook.
- **Fees.** FloatVault owns the fee in this mode: the checkout shows `GET /fees/quote`, the client sends `expectedTotalGhs`, and the server rejects the order if the price changed. The admin settings route refuses to turn on FloatVault while "Pass fees to customers" is on and FloatVault's fee payer is the customer (it would double charge).
- **References.** FloatVault makes its own `fv-…` reference; it is stored as `floatvaultReference`, with `floatvaultCheckoutUrl` so a customer who returns to a pending order sees "Continue to payment". The local reference travels in `metadata` (`orderRef`, `topupRef`, `signupFeeRef`) and is the idempotency key (`prince-k:<ref>`).
- **Amounts.** Pesewas throughout. The signup fee is sent as its exact amount; FloatVault adds its fee on top if the app's fee payer is the customer.

## Where things live

| Piece | File |
|---|---|
| FloatVault client, webhook signature check | `src/lib/floatvault.ts` |
| Starting a hosted checkout | `src/lib/floatvault-charge.ts` |
| Provider quote | `src/lib/payments/quote.ts`, `src/app/api/v1/payment-quote/route.ts` |
| Settlement (orders, top-ups, signup fee) | `src/lib/settlement.ts` |
| Polling fallback | `src/lib/floatvault-sync.ts` |
| Webhook | `src/app/api/v1/floatvault/webhook/route.ts` |

The Paystack webhook and routes are untouched. Webhook events are recorded in `PaymentEvent` with the id `floatvault:<event>:<reference>` (the field is still called `paystackEventId`), so redelivery is a no-op.

## Configuration

| Variable | Purpose |
|---|---|
| `FLOATVAULT_API_URL` | API base, e.g. `https://api-staging.floatvaultsolutions.com/api/v1` or `https://api.floatvaultsolutions.com/api/v1` |
| `FLOATVAULT_API_KEY` | The app's API key from the FloatVault vendor portal (Developers). A `test` key needs a test-mode app, a `live` key a live-mode app |
| `FLOATVAULT_WEBHOOK_SECRET` | The app's webhook signing secret (Developers → Webhooks) |

In the FloatVault vendor portal set the app's webhook URL to `<this app's origin>/api/v1/floatvault/webhook` and subscribe to `payment.success` and `payment.failed`. Set the fee payer in the backoffice. Leave `callbackUrls` empty or include this app's origin, or payments are rejected with `400`.

## Status

- [x] Guest orders, wallet top-ups and the signup fee create a hosted payment and redirect
- [x] Admin payment provider switch with the double-fee guard
- [x] Checked locally against FloatVault staging with Uncle Ebo's staging key: quote, order creation, stale-price guard, `checkoutUrl`, order lookup returns the link while pending
- [ ] Create a FloatVault app for Prince K (vendor, app, key, webhook secret) and fill the three variables
- [ ] Pay one order, one top-up and one signup fee end to end on staging
- [ ] Register the webhook URL on the app
