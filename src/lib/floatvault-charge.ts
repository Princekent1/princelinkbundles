import { createHostedPayment } from "@/lib/floatvault";

type HostedCheckoutParams = {
  reference: string;
  kind: "order" | "topup" | "signupfee";
  amountGhs: number; // pesewas, the base amount; FloatVault adds its own fee when the app's fee payer is the customer
  callbackUrl: string;
};

const METADATA_KEY = { order: "orderRef", topup: "topupRef", signupfee: "signupFeeRef" } as const;

// the local reference is the idempotency key, so a retried request never creates a second payment
export function startHostedCheckout(params: HostedCheckoutParams) {
  return createHostedPayment({
    amount: params.amountGhs,
    callbackUrl: params.callbackUrl,
    idempotencyKey: `prince-k:${params.reference}`,
    metadata: { [METADATA_KEY[params.kind]]: params.reference },
  });
}
