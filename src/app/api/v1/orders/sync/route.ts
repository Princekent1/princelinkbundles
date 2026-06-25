import { createErrorResponse } from "@/lib/errors";
import { OrderModel } from "@/lib/models/order";
import connectMongo from "@/lib/mongo";
import { getIp, jaybartSyncLimiter } from "@/lib/rate-limit";
import { syncJaybartOrder } from "@/lib/sync-jaybart-order";
import { type NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    if (!jaybartSyncLimiter.check(`public:${getIp(req)}`)) {
      return createErrorResponse("RateLimited");
    }

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get("ref")?.trim();
    if (!ref) return createErrorResponse("ValidationError");

    await connectMongo();

    const order = await OrderModel.findOne({ reference: ref }).select("_id").lean();
    if (!order) return createErrorResponse("NotFound");

    const result = await syncJaybartOrder(order._id);
    return Response.json(result);
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
