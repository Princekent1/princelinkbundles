import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import connectMongo from "@/lib/mongo";
import { jaybartSyncLimiter } from "@/lib/rate-limit";
import { syncJaybartOrder } from "@/lib/sync-jaybart-order";
import mongoose from "mongoose";

export const POST = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return createErrorResponse("ValidationError");
    if (!jaybartSyncLimiter.check(`admin:${authUser._id}`)) {
      return createErrorResponse("RateLimited");
    }

    await connectMongo();

    const result = await syncJaybartOrder(new mongoose.Types.ObjectId(id));
    return Response.json(result);
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
