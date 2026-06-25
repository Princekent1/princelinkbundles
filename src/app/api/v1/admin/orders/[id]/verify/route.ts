import connectMongo from "@/lib/mongo";
import { OrderModel } from "@/lib/models/order";
import { BundleModel, type Bundle } from "@/lib/models/bundle";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { verifyTransaction } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { tryAutoSend } from "@/lib/auto-send";
import mongoose from "mongoose";

export const POST = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "admin") return createErrorResponse("Forbidden");

  const { id } = await params;

  try {
    await connectMongo();

    const order = await OrderModel.findById(id)
      .populate<{ bundleId: Bundle & { _id: mongoose.Types.ObjectId } }>({ path: "bundleId", model: BundleModel, select: "jaybartPackageId" });
    if (!order) return createErrorResponse("NotFound");
    if (order.paymentMethod !== "paystack") {
      return Response.json({ message: "Order was not paid via Paystack" }, { status: 400 });
    }

    const result = await verifyTransaction(order.reference);

    if (result.status === "success" && order.status === "pending_payment") {
      await OrderModel.updateOne(
        { _id: order._id },
        {
          status: "paid",
          paidAt: result.paid_at ? new Date(result.paid_at) : new Date(),
          paystackReference: order.reference,
          paystackAmountGhs: result.amount,
        }
      );

      const settings = await getSettings();
      const shouldAutoSend = order.placedBy ? settings.autoSendVendors : settings.autoSendGuests;
      if (shouldAutoSend) {
        const bundle = order.bundleId as (Bundle & { _id: mongoose.Types.ObjectId }) | null;
        await tryAutoSend(order._id, order.customerPhone, bundle?.jaybartPackageId);
      }

      return Response.json({ verified: true, status: "paid" });
    }

    return Response.json({ verified: false, paystackStatus: result.status, orderStatus: order.status });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
