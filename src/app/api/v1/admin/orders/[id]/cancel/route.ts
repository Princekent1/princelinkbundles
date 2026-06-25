import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
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
      {
        _id: id,
        $or: [
          { status: "paid" },
          { status: "fulfilling", jaybartTransactionCode: null },
        ],
      },
      {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: new mongoose.Types.ObjectId(authUser._id),
      },
      { new: true },
    );

    if (!order) return createErrorResponse("NotFound");

    return Response.json({ status: order.status, cancelledAt: order.cancelledAt });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
