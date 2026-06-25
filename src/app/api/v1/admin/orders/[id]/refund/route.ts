import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const PATCH = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    await connectMongo();

    const order = await OrderModel.findOneAndUpdate(
      { _id: id, status: "failed", paymentMethod: "wallet", placedBy: { $ne: null }, refundedAt: null },
      { refundedAt: new Date() },
    );

    if (!order) return createErrorResponse("NotFound");

    const vendorId = order.placedBy as mongoose.Types.ObjectId;

    const vendor = await UserModel.findByIdAndUpdate(
      vendorId,
      { $inc: { walletBalance: order.amountGhs } },
      { new: true }
    );

    if (!vendor) return createErrorResponse("NotFound");

    await WalletTransactionModel.create({
      vendorId,
      type: "refund",
      amountGhs: order.amountGhs,
      balanceAfter: vendor.walletBalance!,
      relatedOrderId: order._id,
      performedBy: new mongoose.Types.ObjectId(authUser._id),
      note: `Refund for failed order ${order.reference}`,
    });

    return Response.json({ refundedAt: new Date(), newBalance: vendor.walletBalance });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
