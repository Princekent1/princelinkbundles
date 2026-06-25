import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    const user = await getAuthUser();
    if (!user) return createErrorResponse("Unauthorized");
    if (user.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const [pendingOrders, pendingVendors] = await Promise.all([
      OrderModel.countDocuments({ status: "paid" }),
      UserModel.countDocuments({ role: "vendor", status: "pending" }),
    ]);

    return Response.json({ pendingOrders, pendingVendors });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
