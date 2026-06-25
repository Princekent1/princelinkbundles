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
      { _id: id, status: "cancelled" },
      { status: "refunded", refundedAt: new Date() },
    );

    if (!order) return createErrorResponse("NotFound");

    if (order.paymentMethod === "wallet" && order.placedBy) {
      const vendorId = order.placedBy as mongoose.Types.ObjectId;
      const vendor = await UserModel.findByIdAndUpdate(
        vendorId,
        { $inc: { walletBalance: order.amountGhs } },
        { new: true },
      );

      if (vendor) {
        await WalletTransactionModel.create({
          vendorId,
          type: "refund",
          amountGhs: order.amountGhs,
          balanceAfter: vendor.walletBalance!,
          relatedOrderId: order._id,
          performedBy: new mongoose.Types.ObjectId(authUser._id),
          note: `Refund for cancelled order ${order.reference}`,
        });
      }
    }

    return Response.json({ status: "refunded", refundedAt: new Date() });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
