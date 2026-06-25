import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import connectMongo from "@/lib/mongo";
import { type NextRequest } from "next/server";

const LIMIT = 25;

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const type = sp.get("type");

    const filter: Record<string, unknown> = {};
    if (type && ["topup", "purchase", "refund", "adjustment"].includes(type)) {
      filter.type = type;
    }

    const [txns, total, summary] = await Promise.all([
      WalletTransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * LIMIT)
        .limit(LIMIT)
        .populate("vendorId", "businessName email")
        .populate("relatedOrderId", "reference")
        .lean(),

      WalletTransactionModel.countDocuments(filter),

      WalletTransactionModel.aggregate([
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amountGhs" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summaryMap: Record<string, { total: number; count: number }> = {};
    for (const s of summary as { _id: string; total: number; count: number }[]) {
      summaryMap[s._id] = { total: s.total, count: s.count };
    }

    return Response.json({
      transactions: txns.map((t) => {
        const vendor = t.vendorId as { _id: unknown; businessName?: string; email?: string } | null;
        const order = t.relatedOrderId as { _id: unknown; reference?: string } | null;
        return {
          _id: t._id.toString(),
          type: t.type,
          amountGhs: t.amountGhs,
          balanceAfter: t.balanceAfter,
          note: t.note ?? null,
          createdAt: t.createdAt,
          vendor: vendor ? { _id: vendor._id?.toString(), businessName: vendor.businessName ?? "", email: vendor.email ?? "" } : null,
          relatedOrderReference: order?.reference ?? null,
          relatedOrderId: order ? order._id?.toString() : null,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / LIMIT),
      summary: {
        topup:      summaryMap.topup      ?? { total: 0, count: 0 },
        purchase:   summaryMap.purchase   ?? { total: 0, count: 0 },
        refund:     summaryMap.refund     ?? { total: 0, count: 0 },
        adjustment: summaryMap.adjustment ?? { total: 0, count: 0 },
      },
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
