import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";
import { type NextRequest } from "next/server";

const LIMIT = 20;

const STATUS_MAP: Record<string, string | string[]> = {
  pending: "pending_payment",
  paid: ["paid", "fulfilling"],
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
};

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "vendor") return createErrorResponse("Forbidden");

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? String(LIMIT), 10)));
    const statusParam = searchParams.get("status")?.toLowerCase();
    const networkParam = searchParams.get("network")?.toLowerCase();
    const paymentParam = searchParams.get("paymentMethod")?.toLowerCase();
    const search = searchParams.get("search")?.trim();

    await connectMongo();

    const vendorId = new mongoose.Types.ObjectId(authUser._id);

    const filter: Record<string, unknown> = { placedBy: vendorId };

    if (statusParam && STATUS_MAP[statusParam]) {
      const mapped = STATUS_MAP[statusParam];
      filter.status = Array.isArray(mapped) ? { $in: mapped } : mapped;
    }

    if (networkParam && ["mtn", "telecel", "airteltigo"].includes(networkParam)) {
      filter.networkSnapshot = networkParam;
    }

    if (paymentParam === "wallet" || paymentParam === "paystack") {
      filter.paymentMethod = paymentParam;
    }

    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const [total, orders] = await Promise.all([
      OrderModel.countDocuments(filter),
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("reference customerPhone networkSnapshot bundleNameSnapshot amountGhs paymentMethod status jaybartTransactionCode createdAt paidAt")
        // jaybartTransactionCode selected only to derive sentToProvider — not forwarded to client
        .lean(),
    ]);

    return Response.json({
      orders: orders.map((o) => ({
        _id: o._id.toString(),
        reference: o.reference,
        customerPhone: o.customerPhone,
        networkSnapshot: o.networkSnapshot,
        bundleNameSnapshot: o.bundleNameSnapshot,
        amountGhs: o.amountGhs,
        paymentMethod: o.paymentMethod,
        status: o.status,
        sentToProvider: !!o.jaybartTransactionCode,
        createdAt: o.createdAt,
        paidAt: o.paidAt ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("[vendor/orders]", err);
    return createErrorResponse("SomethingWentWrong");
  }
};
