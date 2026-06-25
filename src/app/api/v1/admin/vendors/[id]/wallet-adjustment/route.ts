import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const POST = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const amountGhs: number = body?.amountGhs;
    const note: string = body?.note?.trim();

    if (typeof amountGhs !== "number" || amountGhs === 0) {
      return createErrorResponse("ValidationError", "amountGhs must be a non-zero number (pesewas)");
    }
    if (!note) {
      return createErrorResponse("ValidationError", "note is required");
    }

    await connectMongo();

    const vendorId = new mongoose.Types.ObjectId(id);

    const query = amountGhs < 0
      ? { _id: vendorId, role: "vendor", walletBalance: { $gte: -amountGhs } }
      : { _id: vendorId, role: "vendor" };

    const vendor = await UserModel.findOneAndUpdate(
      query,
      { $inc: { walletBalance: amountGhs } },
      { new: true, select: "walletBalance businessName" }
    );

    if (!vendor) {
      return amountGhs < 0
        ? Response.json({ message: "Adjustment would drive balance below zero" }, { status: 400 })
        : createErrorResponse("NotFound");
    }

    await WalletTransactionModel.create({
      vendorId,
      type: "adjustment",
      amountGhs,
      balanceAfter: vendor.walletBalance!,
      performedBy: new mongoose.Types.ObjectId(authUser._id),
      note,
    });

    return Response.json({ newBalance: vendor.walletBalance });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
