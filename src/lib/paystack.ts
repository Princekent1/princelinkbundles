const PAYSTACK_BASE = "https://api.paystack.co";

export type InitResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type VerifyResult = {
  status: string;
  amount: number;
  reference: string;
  paid_at: string | null;
};

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<InitResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Paystack initialization failed");
  return json.data as InitResult;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Paystack verification failed");
  return json.data as VerifyResult;
}

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.PAYSTACK_SECRET_KEY!),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const hashBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex === signature;
}

export function generateTopupReference(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let ref = "TP";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) ref += chars[b % 62];
  return ref;
}
