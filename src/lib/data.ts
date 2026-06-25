export const NETWORKS = [
  { id: "MTN",        label: "MTN",        chipClass: "netchip-mtn",        markClass: "netmark-mtn" },
  { id: "TELECEL",    label: "Telecel",    chipClass: "netchip-telecel",    markClass: "netmark-telecel" },
  { id: "AIRTELTIGO", label: "AirtelTigo", chipClass: "netchip-airteltigo", markClass: "netmark-airteltigo" },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];

export interface Bundle {
  id: string;
  name: string;
  volume: string;
  validity: string;
  price: number;
  tag: "Popular" | "Best value" | null;
}

export const BUNDLES: Record<string, Bundle[]> = {
  MTN: [
    { id: "m1", name: "1 GB",   volume: "1 GB",   validity: "24 hours", price: 7,  tag: "Popular" },
    { id: "m2", name: "2 GB",   volume: "2 GB",   validity: "3 days",   price: 13, tag: null },
    { id: "m3", name: "5 GB",   volume: "5 GB",   validity: "7 days",   price: 28, tag: "Best value" },
    { id: "m4", name: "10 GB",  volume: "10 GB",  validity: "30 days",  price: 55, tag: null },
    { id: "m5", name: "20 GB",  volume: "20 GB",  validity: "30 days",  price: 95, tag: null },
  ],
  TELECEL: [
    { id: "t1", name: "1 GB",  volume: "1 GB",  validity: "24 hours", price: 6,  tag: null },
    { id: "t2", name: "3 GB",  volume: "3 GB",  validity: "7 days",   price: 17, tag: "Popular" },
    { id: "t3", name: "6 GB",  volume: "6 GB",  validity: "14 days",  price: 32, tag: null },
    { id: "t4", name: "15 GB", volume: "15 GB", validity: "30 days",  price: 70, tag: "Best value" },
  ],
  AIRTELTIGO: [
    { id: "a1", name: "2 GB",  volume: "2 GB",  validity: "3 days",  price: 10, tag: null },
    { id: "a2", name: "5 GB",  volume: "5 GB",  validity: "7 days",  price: 24, tag: "Popular" },
    { id: "a3", name: "12 GB", volume: "12 GB", validity: "30 days", price: 55, tag: "Best value" },
  ],
};

export interface Order {
  ref: string;
  phone: string;
  network: string;
  bundle: string;
  amount: number;
  status: "PENDING" | "PAID" | "COMPLETED" | "FAILED" | "CANCELLED";
  paymentMethod: "PAYSTACK" | "WALLET";
  paidAt: string;
  email: string | null;
  placedBy: string | null;
  failureReason?: string | null;
}

export const SAMPLE_ORDERS: Order[] = [
  { ref: "7K9M2A", phone: "0541 205 295", network: "MTN",     bundle: "1 GB — 24 hours",  amount: 7,    status: "PENDING",   paymentMethod: "WALLET",   paidAt: "Today, 14:32", email: "kwame@example.com",  placedBy: "DataFrat GH" },
  { ref: "xQ4nP1", phone: "0276 884 110", network: "TELECEL", bundle: "3 GB — 7 days",    amount: 17,   status: "PENDING",   paymentMethod: "PAYSTACK", paidAt: "Today, 14:28", email: null,                 placedBy: null },
  { ref: "0bZcD8", phone: "0244 991 720", network: "MTN",     bundle: "5 GB — 7 days",    amount: 28,   status: "PENDING",   paymentMethod: "WALLET",   paidAt: "Today, 14:11", email: "ama@example.com",    placedBy: "DataFrat GH" },
  { ref: "9PqWk3", phone: "0203 445 678", network: "ISHARE",  bundle: "1 GB — 1 day",     amount: 5.5,  status: "PAID",      paymentMethod: "PAYSTACK", paidAt: "Today, 13:55", email: null,                 placedBy: null },
  { ref: "Lm2H7y", phone: "0599 102 334", network: "BIGTIME", bundle: "5 GB — 7 days",    amount: 24,   status: "COMPLETED", paymentMethod: "WALLET",   paidAt: "Today, 13:20", email: "yaw@example.com",    placedBy: "BundleKing" },
  { ref: "3RvT8s", phone: "0541 998 020", network: "MTN",     bundle: "10 GB — 30 days",  amount: 55,   status: "COMPLETED", paymentMethod: "PAYSTACK", paidAt: "Today, 12:48", email: null,                 placedBy: null },
  { ref: "Hk5Nm4", phone: "0276 220 113", network: "TELECEL", bundle: "1 GB — 24 hours",  amount: 6,    status: "FAILED",    paymentMethod: "WALLET",   paidAt: "Today, 12:22", email: "esi@example.com",    placedBy: "DataFrat GH", failureReason: "SIM not active on network" },
  { ref: "Qb9Yn2", phone: "0244 776 559", network: "MTN",     bundle: "2 GB — 3 days",    amount: 13,   status: "COMPLETED", paymentMethod: "PAYSTACK", paidAt: "Today, 11:40", email: null,                 placedBy: null },
];

export interface WalletTransaction {
  id: string;
  type: "TOPUP" | "PURCHASE" | "REFUND" | "ADJUSTMENT";
  amountGhs: number;
  balanceAfter: number;
  relatedRef: string | null;
  note: string | null;
  createdAt: string;
}

export const VENDOR_WALLET_BALANCE = 182;

export const SAMPLE_WALLET_TRANSACTIONS: WalletTransaction[] = [
  { id: "wt1", type: "TOPUP",      amountGhs:  200,  balanceAfter: 200,  relatedRef: null,     note: null,                          createdAt: "Today, 14:00" },
  { id: "wt2", type: "PURCHASE",   amountGhs:  -7,   balanceAfter: 193,  relatedRef: "7K9M2A", note: null,                          createdAt: "Today, 14:32" },
  { id: "wt3", type: "PURCHASE",   amountGhs:  -28,  balanceAfter: 165,  relatedRef: "0bZcD8", note: null,                          createdAt: "Today, 14:11" },
  { id: "wt4", type: "REFUND",     amountGhs:   6,   balanceAfter: 171,  relatedRef: "Hk5Nm4", note: "Bundle delivery failed",       createdAt: "Today, 13:00" },
  { id: "wt5", type: "PURCHASE",   amountGhs:  -17,  balanceAfter: 154,  relatedRef: "xQ4nP1", note: null,                          createdAt: "Yesterday, 16:44" },
  { id: "wt6", type: "ADJUSTMENT", amountGhs:   28,  balanceAfter: 182,  relatedRef: null,     note: "Manual top-up by admin",       createdAt: "Yesterday, 09:15" },
  { id: "wt7", type: "TOPUP",      amountGhs:  100,  balanceAfter: 154,  relatedRef: null,     note: null,                          createdAt: "2 days ago, 11:30" },
  { id: "wt8", type: "PURCHASE",   amountGhs:  -55,  balanceAfter:  54,  relatedRef: "3RvT8s", note: null,                          createdAt: "2 days ago, 12:10" },
];

export interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  walletBalance: number;
  joinedAt: string;
  approvedAt: string | null;
}

export const SAMPLE_VENDORS: Vendor[] = [
  { id: "v1", businessName: "DataFrat GH",   email: "kwame@datafrat.gh",    phone: "0541 205 295", status: "APPROVED",  walletBalance: 182,  joinedAt: "Jan 12, 2026", approvedAt: "Jan 13, 2026" },
  { id: "v2", businessName: "BundleKing",     email: "kofi@bundleking.com",  phone: "0276 884 110", status: "APPROVED",  walletBalance: 430,  joinedAt: "Feb 3, 2026",  approvedAt: "Feb 4, 2026" },
  { id: "v3", businessName: "QuickData GH",   email: "ama@quickdata.gh",     phone: "0244 991 720", status: "PENDING",   walletBalance: 0,    joinedAt: "May 1, 2026",  approvedAt: null },
  { id: "v4", businessName: "NetConnect Pro", email: "yaw@netconnect.gh",    phone: "0203 445 678", status: "PENDING",   walletBalance: 0,    joinedAt: "May 3, 2026",  approvedAt: null },
  { id: "v5", businessName: "DataHub360",     email: "esi@datahub360.com",   phone: "0599 102 334", status: "SUSPENDED", walletBalance: 75,   joinedAt: "Mar 8, 2026",  approvedAt: "Mar 9, 2026" },
];

export function ghs(n: number) {
  return "GHS " + Number(n).toFixed(2);
}

// pesewas → GHS display
export function ghsp(pesewas: number) {
  return "GHS " + (pesewas / 100).toFixed(2);
}

export function getNetwork(id: string) {
  const upper = id.toUpperCase();
  return NETWORKS.find(n => n.id === upper) ?? NETWORKS[0];
}
