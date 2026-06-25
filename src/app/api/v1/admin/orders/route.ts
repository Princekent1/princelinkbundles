import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import connectMongo from "@/lib/mongo";
import { type NextRequest } from "next/server";

const LIMIT = 20;

const STATUS_MAP: Record<string, string | string[]> = {
  pending: "pending_payment",
  paid: ["paid", "fulfilling"],
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

function getDateFilter(range: string | null): Record<string, unknown> {
  if (!range || range === "all") return {};
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(start.getDate() - 6);
  else if (range === "30d") start.setDate(start.getDate() - 29);
  return { createdAt: { $gte: start } };
}

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? String(LIMIT), 10)));
    const statusParam = searchParams.get("status")?.toLowerCase();
    const networkParam = searchParams.get("network")?.toLowerCase();
    const paymentParam = searchParams.get("paymentMethod")?.toLowerCase();
    const dateRange = searchParams.get("dateRange");
    const search = searchParams.get("search")?.trim();

    const baseFilter: Record<string, unknown> = { ...getDateFilter(dateRange) };

    if (statusParam && STATUS_MAP[statusParam]) {
      const mapped = STATUS_MAP[statusParam];
      baseFilter.status = Array.isArray(mapped) ? { $in: mapped } : mapped;
    }
    if (networkParam && ["mtn", "telecel", "airteltigo"].includes(networkParam)) {
      baseFilter.networkSnapshot = networkParam;
    }
    if (paymentParam === "wallet" || paymentParam === "paystack") {
      baseFilter.paymentMethod = paymentParam;
    }
    if (search) {
      baseFilter.$or = [
        { reference: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const countFilter: Record<string, unknown> = { ...getDateFilter(dateRange) };
    if (networkParam && ["mtn", "telecel", "airteltigo"].includes(networkParam)) {
      countFilter.networkSnapshot = networkParam;
    }
    if (paymentParam === "wallet" || paymentParam === "paystack") {
      countFilter.paymentMethod = paymentParam;
    }
    if (search) {
      countFilter.$or = baseFilter.$or;
    }

    const [total, orders, counts] = await Promise.all([
      OrderModel.countDocuments(baseFilter),
      OrderModel.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("placedBy", "businessName")
        .lean(),
      OrderModel.aggregate([
        { $match: countFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const rawCounts: Record<string, number> = {};
    for (const c of counts) rawCounts[c._id] = c.count;
    const countsMap: Record<string, number> = {
      pending_payment: rawCounts.pending_payment ?? 0,
      paid: (rawCounts.paid ?? 0) + (rawCounts.fulfilling ?? 0),
      completed: rawCounts.completed ?? 0,
      failed: rawCounts.failed ?? 0,
      cancelled: rawCounts.cancelled ?? 0,
      refunded: rawCounts.refunded ?? 0,
    };
    const totalCount = Object.values(rawCounts).reduce((a, b) => a + b, 0);

    return Response.json({
      orders: orders.map((o) => ({
        _id: o._id.toString(),
        reference: o.reference,
        placedBy: o.placedBy
          ? { _id: (o.placedBy as any)._id.toString(), businessName: (o.placedBy as any).businessName }
          : null,
        customerPhone: o.customerPhone,
        networkSnapshot: o.networkSnapshot,
        bundleNameSnapshot: o.bundleNameSnapshot,
        amountGhs: o.amountGhs,
        priceType: o.priceType ?? null,
        paymentMethod: o.paymentMethod,
        status: o.status,
        jaybartTransactionCode: o.jaybartTransactionCode ?? null,
        jaybartError: o.jaybartError ?? null,
        createdAt: o.createdAt,
        paidAt: o.paidAt ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts: { ...countsMap, all: totalCount },
    });
  } catch (err) {
    console.error("[admin/orders]", err);
    return createErrorResponse("SomethingWentWrong");
  }
};
