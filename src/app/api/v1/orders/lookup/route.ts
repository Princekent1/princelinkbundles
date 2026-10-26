import connectMongo from "@/lib/mongo";
import { OrderModel } from "@/lib/models/order";
import { BundleModel } from "@/lib/models/bundle";
import { syncFloatVaultOrder } from "@/lib/floatvault-sync";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref")?.trim();

  if (!ref) {
    return Response.json({ message: "ref is required" }, { status: 400 });
  }

  try {
    await connectMongo();

    await syncFloatVaultOrder(ref);

    const order = await OrderModel.findOne({ reference: ref }).lean();
    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const bundle = await BundleModel.findById(order.bundleId).lean();

    return Response.json({
      reference: order.reference,
      status: order.status,
      networkSnapshot: order.networkSnapshot,
      bundleNameSnapshot: order.bundleNameSnapshot,
      validityDays: bundle?.validityDays ?? null,
      customerPhone: order.customerPhone,
      amountGhs: order.amountGhs,
      processingFeeGhs: order.processingFeeGhs ?? 0,
      totalPaidGhs: order.totalPaidGhs ?? order.amountGhs,
      paymentMethod: order.paymentMethod,
      checkoutUrl: order.status === "pending_payment" ? (order.floatvaultCheckoutUrl ?? null) : null,
      paidAt: order.paidAt ?? null,
      createdAt: order.createdAt,
    });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
