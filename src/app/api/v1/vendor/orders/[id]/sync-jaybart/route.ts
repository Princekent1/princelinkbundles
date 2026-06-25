import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import connectMongo from "@/lib/mongo";
import { jaybartSyncLimiter } from "@/lib/rate-limit";
import { syncJaybartOrder } from "@/lib/sync-jaybart-order";
import mongoose from "mongoose";

export const POST = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "vendor" || authUser.status !== "approved") {
      return createErrorResponse("Forbidden");
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return createErrorResponse("ValidationError");
    if (!jaybartSyncLimiter.check(`vendor:${authUser._id}`)) {
      return createErrorResponse("RateLimited");
    }

    await connectMongo();

    const order = await OrderModel.findOne({
      _id: id,
      placedBy: new mongoose.Types.ObjectId(authUser._id),
    }).select("_id").lean();
    if (!order) return createErrorResponse("NotFound");

    const result = await syncJaybartOrder(order._id);
    return Response.json(result);
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
