export type FloatVaultChannel = "mtn" | "telecel" | "airteltigo";

export type FloatVaultStatus = "pending" | "otp_required" | "success" | "failed" | "cancelled" | "refunded";

export type FloatVaultFees = { provider: number; network: number; platform: number; total: number };

export type FloatVaultQuote = {
  amount: number;
  feePayer: "customer" | "app_owner";
  fees: FloatVaultFees;
  customerPays: number;
  appOwnerReceives: number;
};

export type FloatVaultPayment = {
  reference: string;
  checkoutUrl?: string;
  amount: number;
  status: FloatVaultStatus;
  customerPays?: number;
  fees?: FloatVaultFees;
  metadata?: Record<string, unknown>;
  failureReason?: string | null;
};

export class FloatVaultError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
  ) {
    super(message);
  }
}

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.FLOATVAULT_API_KEY!}`,
  "Content-Type": "application/json",
});

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.FLOATVAULT_API_URL?.replace(/\/$/, "");
  if (!base || !process.env.FLOATVAULT_API_KEY) throw new FloatVaultError("FloatVault is not configured", 500);

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
    signal: AbortSignal.timeout(25_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FloatVaultError(json.details || json.message || "FloatVault request failed", res.status, json.errorCode);
  }
  return json as T;
}

export async function quoteFees(amountPesewas: number): Promise<FloatVaultQuote> {
  const json = await request<{ data: FloatVaultQuote }>(`/fees/quote?amount=${amountPesewas}`);
  return json.data;
}

export type CreateHostedPaymentParams = {
  amount: number;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
};

// No network or number: FloatVault's hosted checkout collects those, handles any one-time code and retries,
// then sends the customer to callbackUrl. The webhook and getPayment remain the source of truth.
export async function createHostedPayment(params: CreateHostedPaymentParams): Promise<FloatVaultPayment & { checkoutUrl: string }> {
  const json = await request<{ data: FloatVaultPayment }>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": params.idempotencyKey },
    body: JSON.stringify({ amount: params.amount, callbackUrl: params.callbackUrl, metadata: params.metadata }),
  });
  if (!json.data.checkoutUrl) throw new FloatVaultError("FloatVault did not return a checkout link", 502);
  return json.data as FloatVaultPayment & { checkoutUrl: string };
}

export async function getPayment(reference: string): Promise<FloatVaultPayment> {
  const json = await request<{ data: FloatVaultPayment }>(`/payments/${encodeURIComponent(reference)}`);
  return json.data;
}

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.FLOATVAULT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
