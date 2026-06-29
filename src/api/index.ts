import { LoginFields } from "@/app/(auth)/login/page";
import { SignupFields } from "@/app/(auth)/signup/page";
import axios, { AxiosError, isAxiosError } from "axios";
import type { TokenPayload } from "@/lib/jwt";

export type MeUser = {
  _id: string;
  email: string;
  phone: string;
  businessName?: string;
  walletBalance: number;
  role: string;
  status: string;
};

export type DashboardData = {
  walletBalance: number;
  spentThisMonth: number;
  monthlyOrderCount: number;
  pendingOrdersCount: number;
  recentOrders: Array<{
    _id: string;
    reference: string;
    networkSnapshot: string;
    bundleNameSnapshot: string;
    amountGhs: number;
    status: string;
    createdAt: string;
  }>;
};

export const apiClient = axios.create({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  withCredentials: true,
});

type ApiError = AxiosError<{ message: string; details?: string }, any>;
export type StrippedError = { message: string; details?: string };

const throwError = (error: ApiError): never => {
  let message = "Something went wrong. Please try again.";
  let details = "";

  if (isAxiosError(error) && error?.response) {
    message = error.response.data.message || message;
    details = error.response.data.details || details;
  }
  throw { message, details };
};

export const signUp = {
  key: ["signUp"],
  fn: async (data: SignupFields): Promise<{ message: string; autoApproved?: boolean }> => {
    try {
      const res = await apiClient.post("/api/v1/auth/signup", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const getMe = {
  key: ["me"],
  fn: async (): Promise<{ user: MeUser }> => {
    try {
      const res = await apiClient.get("/api/v1/auth/me");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const getVendorDashboard = {
  key: ["vendor", "dashboard"],
  fn: async (): Promise<DashboardData> => {
    try {
      const res = await apiClient.get("/api/v1/vendor/dashboard");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type VendorOrderItem = {
  _id: string;
  reference: string;
  customerPhone: string;
  networkSnapshot: string;
  bundleNameSnapshot: string;
  amountGhs: number;
  paymentMethod: string;
  status: string;
  sentToProvider: boolean;
  createdAt: string;
  paidAt: string | null;
};

export type VendorOrdersData = {
  orders: VendorOrderItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type VendorOrdersParams = {
  page?: number;
  limit?: number;
  status?: string;
  network?: string;
  paymentMethod?: string;
  search?: string;
};

export const getVendorOrders = {
  key: (params: VendorOrdersParams) => ["vendor", "orders", params],
  fn: async (params: VendorOrdersParams = {}): Promise<VendorOrdersData> => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      if (params.status) query.set("status", params.status);
      if (params.network) query.set("network", params.network);
      if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
      if (params.search) query.set("search", params.search);
      const res = await apiClient.get(`/api/v1/vendor/orders?${query.toString()}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type AdminDashboardData = {
  pendingOrdersCount: number;
  todayRevenue: number;
  ordersToday: number;
  allTimeRevenue: number;
  revenueChart: Array<{ date: string; amountGhs: number }>;
  pendingQueue: Array<{
    _id: string;
    reference: string;
    networkSnapshot: string;
    bundleNameSnapshot: string;
    customerPhone: string;
    amountGhs: number;
    createdAt: string;
  }>;
  todayByNetwork: Array<{ network: string; revenue: number; orderCount: number }>;
  pendingVendorsCount: number;
  profit: {
    guest: { revenue: number; cost: number; margin: number };
    vendor: { revenue: number; cost: number; margin: number };
  } | null;
};

export const getAdminDashboard = {
  key: (period = "7d") => ["admin", "dashboard", period],
  fn: async (period = "7d"): Promise<AdminDashboardData> => {
    try {
      const res = await apiClient.get(`/api/v1/admin/dashboard?period=${period}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const logout = {
  key: ["logout"],
  fn: async (): Promise<void> => {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const login = {
  key: ["login"],
  fn: async (data: LoginFields): Promise<{ message: string; user: TokenPayload }> => {
    try {
      const res = await apiClient.post("/api/v1/auth/login", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Public Bundles ──────────────────────────────────────────────────────────

export type PublicBundle = {
  _id: string;
  network: string;
  name: string;
  validity: string;
  validityDays: number;
  priceGhs: number;
  vendorPriceGhs?: number; // present only for approved vendor sessions
};

export type PublicBundlesData = { bundles: PublicBundle[] };

export const getBundles = {
  key: (network?: string) => ["bundles", network ?? "all"],
  fn: async (network?: string): Promise<PublicBundlesData> => {
    try {
      const q = network ? `?network=${network}` : "";
      const res = await apiClient.get(`/api/v1/bundles${q}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type PaymentSettings = {
  passPaystackFeesToCustomers: boolean;
  paystackFeeRateBps: number;
};

export const getPaymentSettings = {
  key: ["payment", "settings"],
  fn: async (): Promise<PaymentSettings> => {
    try {
      const res = await apiClient.get("/api/v1/payment-settings");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type GuestOrderInput = {
  bundleId: string;
  customerPhone: string;
  customerEmail?: string;
};

export const createGuestOrder = {
  fn: async (data: GuestOrderInput): Promise<{
    reference: string;
    paystackUrl: string;
    amountGhs: number;
    processingFeeGhs: number;
    totalPaidGhs: number;
  }> => {
    try {
      const res = await apiClient.post("/api/v1/orders/guest", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type VendorOrderInput = {
  bundleId: string;
  customerPhone: string;
};

export type VendorOrderResult = {
  reference: string;
  bundleName: string;
  network: string;
  validityDays: number;
  amountGhs: number;
};

export const createVendorOrder = {
  fn: async (data: VendorOrderInput): Promise<VendorOrderResult> => {
    try {
      const res = await apiClient.post("/api/v1/orders/vendor", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Orders ────────────────────────────────────────────────────────────

export type AdminOrderItem = {
  _id: string;
  reference: string;
  placedBy: { _id: string; businessName: string } | null;
  customerPhone: string;
  networkSnapshot: string;
  bundleNameSnapshot: string;
  amountGhs: number;
  priceType: "public" | "vendor" | null;
  paymentMethod: string;
  status: string;
  jaybartTransactionCode: string | null;
  jaybartError: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type AdminOrdersData = {
  orders: AdminOrderItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
};

export type AdminOrdersParams = {
  page?: number;
  status?: string;
  network?: string;
  paymentMethod?: string;
  dateRange?: string;
  search?: string;
};

export const getAdminOrders = {
  key: (params: AdminOrdersParams) => ["admin", "orders", params],
  fn: async (params: AdminOrdersParams = {}): Promise<AdminOrdersData> => {
    try {
      const q = new URLSearchParams();
      if (params.page) q.set("page", String(params.page));
      if (params.status) q.set("status", params.status);
      if (params.network) q.set("network", params.network);
      if (params.paymentMethod) q.set("paymentMethod", params.paymentMethod);
      if (params.dateRange) q.set("dateRange", params.dateRange);
      if (params.search) q.set("search", params.search);
      const res = await apiClient.get(`/api/v1/admin/orders?${q}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type AdminOrderDetail = {
  _id: string;
  reference: string;
  placedBy: { _id: string; businessName: string; email: string; phone: string } | null;
  customerPhone: string;
  customerEmail: string | null;
  bundleId: string;
  jaybartPackageId: number | null;
  bundleNameSnapshot: string;
  networkSnapshot: string;
  amountGhs: number;
  priceType: "public" | "vendor" | null;
  processingFeeGhs: number;
  totalPaidGhs: number;
  processingFeeRateBps: number;
  paystackAmountGhs: number | null;
  paymentMethod: string;
  status: string;
  paystackReference: string | null;
  jaybartTransactionCode: string | null;
  jaybartError: string | null;
  paidAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  failedAt: string | null;
  failedBy: string | null;
  failureReason: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getAdminOrderDetail = {
  key: (id: string) => ["admin", "orders", id],
  fn: async (id: string): Promise<AdminOrderDetail> => {
    try {
      const res = await apiClient.get(`/api/v1/admin/orders/${id}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const completeOrder = {
  fn: async (id: string): Promise<{ status: string; completedAt: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/orders/${id}/complete`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const failOrder = {
  fn: async (id: string, failureReason: string): Promise<{ status: string; canRefund: boolean }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/orders/${id}/fail`, { failureReason });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const refundOrder = {
  fn: async (id: string): Promise<{ refundedAt: string; newBalance: number }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/orders/${id}/refund`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const syncAdminOrder = {
  fn: async (id: string): Promise<{ status: string }> => {
    try {
      const res = await apiClient.post(`/api/v1/admin/orders/${id}/sync-jaybart`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const syncVendorOrder = {
  fn: async (id: string): Promise<{ status: string }> => {
    try {
      const res = await apiClient.post(`/api/v1/vendor/orders/${id}/sync-jaybart`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Vendors ───────────────────────────────────────────────────────────

export type AdminVendorItem = {
  _id: string;
  businessName: string;
  email: string;
  phone: string;
  walletBalance: number;
  status: string;
  createdAt: string;
};

export type AdminVendorsData = {
  vendors: AdminVendorItem[];
  total: number;
  counts: Record<string, number>;
};

export type AdminVendorsParams = {
  status?: string;
  search?: string;
};

export const getAdminVendors = {
  key: (params: AdminVendorsParams) => ["admin", "vendors", params],
  fn: async (params: AdminVendorsParams = {}): Promise<AdminVendorsData> => {
    try {
      const q = new URLSearchParams();
      if (params.status) q.set("status", params.status);
      if (params.search) q.set("search", params.search);
      const res = await apiClient.get(`/api/v1/admin/vendors?${q}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type AdminVendorDetail = {
  vendor: {
    _id: string;
    businessName: string;
    email: string;
    phone: string;
    walletBalance: number;
    status: string;
    createdAt: string;
    approvedAt: string | null;
    suspendedAt: string | null;
  };
  recentTxns: Array<{
    _id: string;
    type: string;
    amountGhs: number;
    balanceAfter: number;
    note: string | null;
    createdAt: string;
  }>;
  recentOrders: Array<{
    _id: string;
    reference: string;
    networkSnapshot: string;
    bundleNameSnapshot: string;
    amountGhs: number;
    status: string;
    createdAt: string;
  }>;
};

export const getAdminVendorDetail = {
  key: (id: string) => ["admin", "vendors", id],
  fn: async (id: string): Promise<AdminVendorDetail> => {
    try {
      const res = await apiClient.get(`/api/v1/admin/vendors/${id}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const updateVendorStatus = {
  fn: async (id: string, action: "approve" | "suspend" | "reactivate"): Promise<{ status: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/vendors/${id}`, { action });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const walletAdjustment = {
  fn: async (id: string, amountGhs: number, note: string): Promise<{ newBalance: number }> => {
    try {
      const res = await apiClient.post(`/api/v1/admin/vendors/${id}/wallet-adjustment`, { amountGhs, note });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Bundles ───────────────────────────────────────────────────────────

export type AdminBundleItem = {
  _id: string;
  network: string;
  name: string;
  displayName: string;
  volumeMb: number;
  validityDays: number;
  priceGhs: number;
  vendorPriceGhs: number | null;
  sortOrder: number;
  jaybartPackageId: number | null;
  jaybartNetworkId: number | null;
  jaybartCostGhs: number | null;
  archivedAt: string | null;
  createdAt: string;
};

export type AdminBundlesData = {
  bundles: AdminBundleItem[];
  counts: {
    active: Record<string, number>;
    archived: Record<string, number>;
  };
};

export const getAdminBundles = {
  key: (network?: string, status?: "active" | "archived") => ["admin", "bundles", network ?? "all", status ?? "active"],
  fn: async (network?: string, status: "active" | "archived" = "active"): Promise<AdminBundlesData> => {
    try {
      const q = new URLSearchParams();
      if (network) q.set("network", network);
      if (status === "archived") q.set("status", status);
      const qs = q.toString();
      const res = await apiClient.get(`/api/v1/admin/bundles${qs ? `?${qs}` : ""}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type CreateBundleInput = {
  network: string;
  volumeMb: number;
  validityDays: number;
  priceGhs: number;
  vendorPriceGhs?: number | null;
  sortOrder?: number;
  jaybartPackageId?: number | null;
  jaybartNetworkId?: number | null;
};

export const createBundle = {
  fn: async (data: CreateBundleInput): Promise<AdminBundleItem> => {
    try {
      const res = await apiClient.post("/api/v1/admin/bundles", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const updateBundle = {
  fn: async (id: string, data: { priceGhs?: number; vendorPriceGhs?: number | null; jaybartPackageId?: number | null; jaybartNetworkId?: number | null; displayName?: string }): Promise<AdminBundleItem> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/bundles/${id}`, data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const archiveBundle = {
  fn: async (id: string): Promise<{ archivedAt: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/bundles/${id}/archive`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const restoreBundle = {
  fn: async (id: string): Promise<{ archivedAt: null }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/bundles/${id}/restore`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Order Lookup ────────────────────────────────────────────────────────────

export type OrderLookupResult = {
  reference: string;
  status: string;
  networkSnapshot: string;
  bundleNameSnapshot: string;
  validityDays: number | null;
  customerPhone: string;
  amountGhs: number;
  processingFeeGhs: number;
  totalPaidGhs: number;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
};

export const lookupOrder = {
  key: (ref: string) => ["orders", "lookup", ref],
  fn: async (ref: string): Promise<OrderLookupResult> => {
    try {
      const res = await apiClient.get(`/api/v1/orders/lookup?ref=${encodeURIComponent(ref)}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Vendor Wallet ───────────────────────────────────────────────────────────

export type WalletTransactionItem = {
  _id: string;
  type: string;
  amountGhs: number;
  balanceAfter: number;
  relatedOrderId: string | null;
  relatedTopupId: string | null;
  relatedOrderReference: string | null;
  relatedTopupReference: string | null;
  note: string | null;
  createdAt: string;
};

export type VendorWalletData = {
  walletBalance: number;
  transactions: WalletTransactionItem[];
  total: number;
  page: number;
  totalPages: number;
};

export const getVendorWallet = {
  key: (page = 1) => ["vendor", "wallet", page],
  fn: async (page = 1): Promise<VendorWalletData> => {
    try {
      const res = await apiClient.get(`/api/v1/vendor/wallet/transactions?page=${page}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const initWalletTopup = {
  fn: async (amountGhs: number): Promise<{
    paystackUrl: string;
    reference: string;
    amountGhs: number;
    processingFeeGhs: number;
    totalPaidGhs: number;
  }> => {
    try {
      const res = await apiClient.post("/api/v1/vendor/wallet/topup", { amountGhs });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type PendingTopupItem = {
  _id: string;
  reference: string;
  amountGhs: number;
  processingFeeGhs: number;
  totalPaidGhs: number;
  createdAt: string;
};

export const getPendingTopups = {
  key: ["vendor", "wallet", "topups", "pending"],
  fn: async (): Promise<{ topups: PendingTopupItem[] }> => {
    try {
      const res = await apiClient.get("/api/v1/vendor/wallet/topup/pending");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export type VerifyTopupResult =
  | { credited: true; amountGhs: number; processingFeeGhs: number; totalPaidGhs: number; newBalance: number }
  | { credited: false; paystackStatus: string }
  | { alreadyProcessed: true; status: string };

export const verifyTopup = {
  fn: async (reference: string): Promise<VerifyTopupResult> => {
    try {
      const res = await apiClient.post("/api/v1/vendor/wallet/topup/verify", { reference });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Auth: Change Password ───────────────────────────────────────────────────

export const changePassword = {
  fn: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    try {
      const res = await apiClient.patch("/api/v1/auth/password", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Nav Counts ────────────────────────────────────────────────────────

export type AdminNavCounts = { pendingOrders: number; pendingVendors: number };

export const getAdminNavCounts = {
  key: ["admin", "nav-counts"],
  fn: async (): Promise<AdminNavCounts> => {
    try {
      const res = await apiClient.get("/api/v1/admin/nav-counts");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Verify ────────────────────────────────────────────────────────────

export const verifyOrderPayment = {
  fn: async (id: string): Promise<{ verified: boolean; status?: string; paystackStatus?: string; orderStatus?: string }> => {
    try {
      const res = await apiClient.post(`/api/v1/admin/orders/${id}/verify`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Bundles — Jaybart ─────────────────────────────────────────────────

export type JaybartPackage = {
  id: number;
  network_id: number;
  volume: number;
  volumeGB: string;
  console_price: string;
  status: string;
  network: string;
};

export const getJaybartPackages = {
  key: ["admin", "jaybart", "packages"],
  fn: async (): Promise<{ packages: JaybartPackage[] }> => {
    try {
      const res = await apiClient.get("/api/v1/admin/jaybart/packages");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const syncJaybartBundles = {
  fn: async (): Promise<{ updated: number; unchanged: number; unresolved: number }> => {
    try {
      const res = await apiClient.post("/api/v1/admin/jaybart/sync");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};


// ─── Admin Settings ───────────────────────────────────────────────────────────

export type FulfillmentSettings = {
  autoSendVendors: boolean;
  autoSendGuests: boolean;
  autoApproveVendors: boolean;
  passPaystackFeesToCustomers: boolean;
  contactPhone: string;
  whatsappCommunityUrl: string;
  paystackFeeRateBps: number;
  jaybartBalance: string | null;
};

export const getFulfillmentSettings = {
  key: ["admin", "settings", "fulfillment"],
  fn: async (): Promise<FulfillmentSettings> => {
    try {
      const res = await apiClient.get("/api/v1/admin/settings");
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const updateFulfillmentSettings = {
  fn: async (data: Partial<Pick<FulfillmentSettings, "autoSendVendors" | "autoSendGuests" | "autoApproveVendors" | "passPaystackFeesToCustomers" | "contactPhone" | "whatsappCommunityUrl">>): Promise<Omit<FulfillmentSettings, "jaybartBalance" | "paystackFeeRateBps">> => {
    try {
      const res = await apiClient.patch("/api/v1/admin/settings", data);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

export const getPublicSettings = {
  key: ["settings", "public"],
  fn: async (): Promise<{ contactPhone: string }> => {
    try {
      const res = await apiClient.get("/api/v1/settings/public");
      return res.data;
    } catch {
      return { contactPhone: "" };
    }
  },
};

export const getSiteConfig = {
  key: ["settings", "site"],
  fn: async (): Promise<{ whatsappCommunityUrl: string }> => {
    try {
      const res = await apiClient.get("/api/v1/settings/site");
      return res.data;
    } catch {
      return { whatsappCommunityUrl: "" };
    }
  },
};

// ─── Admin Vendors — Change Password ─────────────────────────────────────────

export const changeVendorPassword = {
  fn: async (id: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/vendors/${id}/password`, { newPassword, confirmPassword });
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Orders — Cancel ────────────────────────────────────────────────────

export const cancelOrder = {
  fn: async (id: string): Promise<{ status: string; cancelledAt: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/orders/${id}/cancel`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Orders — Mark Refunded ─────────────────────────────────────────────

export const markOrderRefunded = {
  fn: async (id: string): Promise<{ refundedAt: string }> => {
    try {
      const res = await apiClient.patch(`/api/v1/admin/orders/${id}/mark-refunded`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};

// ─── Admin Transactions ───────────────────────────────────────────────────────

export type AdminTransaction = {
  _id: string;
  type: "topup" | "purchase" | "refund" | "adjustment";
  amountGhs: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  vendor: { _id: string; businessName: string; email: string } | null;
  relatedOrderReference: string | null;
  relatedOrderId: string | null;
};

export type AdminTransactionsParams = { page?: number; type?: string; search?: string };

export const getAdminTransactions = {
  key: (params: AdminTransactionsParams) => ["admin", "transactions", params],
  fn: async (params: AdminTransactionsParams): Promise<{
    transactions: AdminTransaction[];
    total: number;
    page: number;
    totalPages: number;
    summary: Record<"topup" | "purchase" | "refund" | "adjustment", { total: number; count: number }>;
  }> => {
    try {
      const sp = new URLSearchParams();
      if (params.page) sp.set("page", String(params.page));
      if (params.type) sp.set("type", params.type);
      if (params.search) sp.set("search", params.search);
      const res = await apiClient.get(`/api/v1/admin/transactions?${sp.toString()}`);
      return res.data;
    } catch (error) {
      return throwError(error as ApiError);
    }
  },
};
