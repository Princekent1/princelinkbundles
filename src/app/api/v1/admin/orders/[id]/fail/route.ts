import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const PATCH = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const failureReason = body?.failureReason?.trim();

    if (!failureReason) {
      return createErrorResponse("ValidationError", "failureReason is required");
    }

    await connectMongo();

    const order = await OrderModel.findOneAndUpdate(
      { _id: id, status: { $in: ["paid", "fulfilling"] } },
      {
        status: "failed",
        failedAt: new Date(),
        failedBy: new mongoose.Types.ObjectId(authUser._id),
        failureReason,
      },
      { new: true }
    );

    if (!order) return createErrorResponse("NotFound");

    return Response.json({
      status: order.status,
      failedAt: order.failedAt,
      failureReason: order.failureReason,
      canRefund: order.paymentMethod === "wallet" && order.placedBy != null,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
