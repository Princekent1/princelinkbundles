import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { BundleModel, type Bundle } from "@/lib/models/bundle";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const GET = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    await connectMongo();

    const order = await OrderModel.findById(id)
      .populate("placedBy", "businessName email phone")
      .populate("completedBy", "email")
      .populate("failedBy", "email")
      .populate<{ bundleId: Bundle & { _id: mongoose.Types.ObjectId } }>({ path: "bundleId", model: BundleModel, select: "jaybartPackageId" })
      .lean() as any;

    if (!order) return createErrorResponse("NotFound");

    const vendor = order.placedBy;
    const bundle = order.bundleId;

    return Response.json({
      _id: order._id.toString(),
      reference: order.reference,
      placedBy: vendor
        ? { _id: vendor._id.toString(), businessName: vendor.businessName, email: vendor.email, phone: vendor.phone }
        : null,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? null,
      bundleId: bundle?._id?.toString() ?? order.bundleId?.toString(),
      jaybartPackageId: bundle?.jaybartPackageId ?? null,
      bundleNameSnapshot: order.bundleNameSnapshot,
      networkSnapshot: order.networkSnapshot,
      amountGhs: order.amountGhs,
      priceType: order.priceType ?? null,
      processingFeeGhs: order.processingFeeGhs ?? 0,
      totalPaidGhs: order.totalPaidGhs ?? order.amountGhs,
      processingFeeRateBps: order.processingFeeRateBps ?? 0,
      paystackAmountGhs: order.paystackAmountGhs ?? null,
      paymentMethod: order.paymentMethod,
      status: order.status,
      paystackReference: order.paystackReference ?? null,
      jaybartTransactionCode: order.jaybartTransactionCode ?? null,
      jaybartError: order.jaybartError ?? null,
      paidAt: order.paidAt ?? null,
      completedAt: order.completedAt ?? null,
      completedBy: order.completedBy ? (order.completedBy as any).email : null,
      failedAt: order.failedAt ?? null,
      failedBy: order.failedBy ? (order.failedBy as any).email : null,
      failureReason: order.failureReason ?? null,
      refundedAt: order.refundedAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
