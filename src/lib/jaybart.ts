import { createLogger } from "./logger"

const log = createLogger("jaybart")
const JAYBART_BASE = "https://agent.jaybartservices.com/api/v1";

function headers() {
  return {
    "x-api-key": process.env.JAYBART_API_KEY!,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export type JaybartPackage = {
  id: number;
  network_id: number;
  volume: number;
  volumeGB: string;
  console_price: string;
  status: string;
  network: string;
};

export type JaybartNetwork = {
  id: number;
  name: string;
  description: string;
};

export type SendBundleResult = {
  success: boolean;
  message: string;
  transaction_code?: string;
};

export async function fetchPackages(): Promise<JaybartPackage[]> {
  log("fetchPackages")
  const res = await fetch(`${JAYBART_BASE}/fetch-data-packages`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) {
    log("fetchPackages error %o", json)
    throw new Error(json.message ?? "Jaybart: failed to fetch packages")
  }
  log("fetchPackages ok count=%d", (json as JaybartPackage[]).length)
  return json as JaybartPackage[];
}

export async function fetchNetworks(): Promise<JaybartNetwork[]> {
  const res = await fetch(`${JAYBART_BASE}/fetch-networks`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Jaybart: failed to fetch networks");
  return json as JaybartNetwork[];
}

export async function checkBalance(): Promise<{ status: string; userWalletBalance: string }> {
  const res = await fetch(`${JAYBART_BASE}/check-console-balance`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Jaybart: failed to check balance");
  return json;
}

export async function sendBundle(recipientMsisdn: string, jaybartPackageId: number): Promise<SendBundleResult> {
  log("sendBundle msisdn=%s packageId=%d", recipientMsisdn, jaybartPackageId)
  const packages = await fetchPackages();
  const pkg = packages.find(p => p.id === jaybartPackageId);
  if (!pkg) {
    log("sendBundle package not found packageId=%d", jaybartPackageId)
    return { success: false, message: `Jaybart package ${jaybartPackageId} not found in package list` };
  }
  const payload = { recipient_msisdn: recipientMsisdn, network_id: pkg.network_id, shared_bundle: pkg.volume }
  log("sendBundle request %o", payload)
  const res = await fetch(`${JAYBART_BASE}/buy-other-package`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  log("sendBundle response %o", json)
  return json as SendBundleResult;
}

export type JaybartTransactionItem = {
  id: number;
  price: string;
  beneficiary_number: string;
  status: string;
  network: string;
  volume: string;
};

export type JaybartTransactionResponse = {
  id: number;
  type: string;
  source: string;
  amount: string;
  transaction_code: string;
  created_at: string;
  order_items: JaybartTransactionItem[];
};

export async function checkTransaction(transactionId: string): Promise<JaybartTransactionResponse> {
  log("checkTransaction txn=%s", transactionId)
  const res = await fetch(`${JAYBART_BASE}/fetch-other-network-transaction`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ transaction_id: transactionId }),
  });
  const json = await res.json();
  log("checkTransaction response %o", json)
  return json as JaybartTransactionResponse;
}

export function mapJaybartNetwork(name: string): "mtn" | "telecel" | "airteltigo" | null {
  const n = name.toLowerCase();
  if (n.includes("mtn")) return "mtn";
  if (n.includes("telecel")) return "telecel";
  if (n.includes("at") || n.includes("airtel") || n.includes("tigo") || n.includes("ishare")) return "airteltigo";
  return null;
}
