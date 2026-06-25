import connectMongo from "@/lib/mongo";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { UserModel } from "@/lib/models/user";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { verifyTransaction } from "@/lib/paystack";
import mongoose from "mongoose";

export const POST = async (req: Request) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor" || user.status !== "approved") return createErrorResponse("Forbidden");

  const body = await req.json().catch(() => ({}));
  const { reference } = body;

  if (!reference || typeof reference !== "string") {
    return Response.json({ message: "reference is required" }, { status: 400 });
  }

  try {
    await connectMongo();

    const topup = await WalletTopupModel.findOne({
      reference,
      vendorId: new mongoose.Types.ObjectId(user._id),
    });

    if (!topup) {
      return Response.json({ message: "Top-up not found" }, { status: 404 });
    }

    if (topup.status !== "pending") {
      return Response.json({ alreadyProcessed: true, status: topup.status });
    }

    const paystackResult = await verifyTransaction(reference);

    if (paystackResult.status !== "success") {
      return Response.json({ credited: false, paystackStatus: paystackResult.status });
    }

    const claimed = await WalletTopupModel.findOneAndUpdate(
      { _id: topup._id, status: "pending" },
      {
        status: "success",
        paidAt: new Date(),
        paystackReference: reference,
        paystackAmountGhs: paystackResult.amount,
      }
    );

    if (!claimed) {
      return Response.json({ alreadyProcessed: true, status: "success" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      topup.vendorId,
      { $inc: { walletBalance: topup.amountGhs } },
      { new: true, select: "walletBalance" }
    );

    await WalletTransactionModel.create({
      vendorId: topup.vendorId,
      type: "topup",
      amountGhs: topup.amountGhs,
      balanceAfter: updatedUser!.walletBalance,
      relatedTopupId: topup._id,
      note: `Manual verify: ${reference}`,
    });

    return Response.json({
      credited: true,
      amountGhs: topup.amountGhs,
      processingFeeGhs: topup.processingFeeGhs ?? 0,
      totalPaidGhs: topup.totalPaidGhs ?? topup.amountGhs,
      newBalance: updatedUser!.walletBalance,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
