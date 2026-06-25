import connectMongo from "@/lib/mongo";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import mongoose from "mongoose";

export const GET = async () => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor" || user.status !== "approved") return createErrorResponse("Forbidden");

  try {
    await connectMongo();

    const topups = await WalletTopupModel.find({
      vendorId: new mongoose.Types.ObjectId(user._id),
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      topups: topups.map(t => ({
        _id: String(t._id),
        reference: t.reference,
        amountGhs: t.amountGhs,
        processingFeeGhs: t.processingFeeGhs ?? 0,
        totalPaidGhs: t.totalPaidGhs ?? t.amountGhs,
        createdAt: t.createdAt,
      })),
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
