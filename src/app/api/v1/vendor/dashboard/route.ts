import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "vendor") return createErrorResponse("Forbidden");

    await connectMongo();

    const vendorId = new mongoose.Types.ObjectId(authUser._id);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [user, spendAgg, pendingOrdersCount, recentOrders] = await Promise.all([
      UserModel.findById(vendorId).select("walletBalance").lean(),

      WalletTransactionModel.aggregate([
        { $match: { vendorId, type: "purchase", createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: { $multiply: [-1, "$amountGhs"] } }, count: { $sum: 1 } } },
      ]),

      OrderModel.countDocuments({
        placedBy: vendorId,
        status: { $in: ["paid", "pending_payment"] },
      }),

      OrderModel.find({ placedBy: vendorId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("reference networkSnapshot bundleNameSnapshot amountGhs status createdAt")
        .lean(),
    ]);

    return Response.json({
      walletBalance: user?.walletBalance ?? 0,
      spentThisMonth: spendAgg[0]?.total ?? 0,
      monthlyOrderCount: spendAgg[0]?.count ?? 0,
      pendingOrdersCount,
      recentOrders: recentOrders.map((o) => ({
        _id: o._id.toString(),
        reference: o.reference,
        networkSnapshot: o.networkSnapshot,
        bundleNameSnapshot: o.bundleNameSnapshot,
        amountGhs: o.amountGhs,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
