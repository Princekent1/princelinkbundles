import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { BundleModel, type Bundle } from "@/lib/models/bundle";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";
import { sendBundle } from "@/lib/jaybart";

export const PATCH = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const authUser = await getAuthUser();
  if (!authUser) return createErrorResponse("Unauthorized");
  if (authUser.role !== "admin") return createErrorResponse("Forbidden");

  const { id } = await params;
  let bundleSent = false;
  let claimedOrderId: mongoose.Types.ObjectId | null = null;

  try {
    await connectMongo();

    const order = await OrderModel.findOneAndUpdate(
      { _id: id, status: { $in: ["paid", "fulfilling"] }, jaybartTransactionCode: null },
      { status: "fulfilling" },
    ).populate<{ bundleId: Bundle & { _id: mongoose.Types.ObjectId } }>({ path: "bundleId", model: BundleModel, select: "jaybartPackageId" });

    if (!order) return createErrorResponse("NotFound");
    claimedOrderId = order._id;

    const bundle = order.bundleId as (Bundle & { _id: mongoose.Types.ObjectId }) | null;
    const jaybartPackageId = bundle?.jaybartPackageId;

    if (!jaybartPackageId) {
      await OrderModel.updateOne({ _id: order._id }, { status: "paid" });
      return Response.json(
        { message: "Bundle is not mapped to a Jaybart package — cannot fulfil automatically. Map it in Bundle Catalog first." },
        { status: 422 }
      );
    }

    const result = await sendBundle(order.customerPhone, jaybartPackageId);

    if (!result.success) {
      await OrderModel.updateOne(
        { _id: order._id },
        { status: "paid", jaybartError: result.message ?? "Jaybart rejected the order" }
      );
      return Response.json(
        { message: `Jaybart rejected the order: ${result.message}` },
        { status: 422 }
      );
    }

    bundleSent = true;

    await OrderModel.updateOne(
      { _id: order._id },
      {
        jaybartTransactionCode: result.transaction_code ?? null,
        jaybartError: null,
      }
    );

    return Response.json({
      status: "fulfilling",
      jaybartTransactionCode: result.transaction_code ?? null,
    });
  } catch (err: unknown) {
    if (claimedOrderId && !bundleSent) {
      await OrderModel.updateOne({ _id: claimedOrderId }, { status: "paid" }).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ message }, { status: 500 });
  }
};
