import { createLogger } from "@/lib/logger";
import connectMongo from "@/lib/mongo";

const log = createLogger("orders:vendor")
import { BundleModel, effectiveVendorPrice } from "@/lib/models/bundle";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { effectiveBundleName } from "@/lib/bundle-name";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { getSettings } from "@/lib/models/settings";
import { tryAutoSend } from "@/lib/auto-send";
import mongoose from "mongoose";

function generateReference(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "WL";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) result += chars[b % 62];
  return result;
}

export const POST = async (req: Request) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "vendor" || authUser.status !== "approved") {
      return createErrorResponse("Forbidden");
    }

    const body = await req.json().catch(() => ({}));
    const { bundleId, customerPhone } = body;

    if (!bundleId || typeof bundleId !== "string") {
      return createErrorResponse("ValidationError", "bundleId is required");
    }
    if (!customerPhone || typeof customerPhone !== "string" || customerPhone.trim().length < 10) {
      return createErrorResponse("ValidationError", "A valid customerPhone is required");
    }

    log("create vendorId=%s bundleId=%s phone=%s", authUser._id, bundleId, customerPhone)

    await connectMongo();

    const bundle = await BundleModel.findOne({ _id: bundleId, archivedAt: null }).lean();
    if (!bundle) {
      log("bundle not found bundleId=%s", bundleId)
      return Response.json({ message: "Bundle not found or unavailable" }, { status: 404 });
    }

    const settings = await getSettings();

    if (settings.disabledNetworks.includes(bundle.network)) {
      log("network disabled network=%s bundleId=%s vendorId=%s", bundle.network, bundleId, authUser._id)
      return Response.json({ message: "This network is currently unavailable" }, { status: 400 });
    }

    const price = effectiveVendorPrice(bundle);
    const vendorId = new mongoose.Types.ObjectId(authUser._id);

    const vendor = await UserModel.findOneAndUpdate(
      { _id: vendorId, role: "vendor", status: "approved", walletBalance: { $gte: price } },
      { $inc: { walletBalance: -price } },
      { new: true, select: "walletBalance" }
    );

    if (!vendor) {
      log("insufficient balance vendorId=%s bundlePrice=%d", vendorId, price)
      return Response.json({ message: "Insufficient wallet balance" }, { status: 400 });
    }

    let reference = generateReference();
    for (let i = 0; i < 4; i++) {
      if (!(await OrderModel.exists({ reference }))) break;
      reference = generateReference();
    }

    let order;
    try {
      order = await OrderModel.create({
        reference,
        placedBy: vendorId,
        paymentMethod: "wallet",
        customerPhone: customerPhone.replace(/\s/g, ""),
        bundleId: bundle._id,
        bundleNameSnapshot: effectiveBundleName(bundle),
        networkSnapshot: bundle.network,
        amountGhs: price,
        priceType: "vendor",
        status: "paid",
        paidAt: new Date(),
      });

      await WalletTransactionModel.create({
        vendorId,
        type: "purchase",
        amountGhs: -price,
        balanceAfter: vendor.walletBalance!,
        relatedOrderId: order._id,
        note: null,
      });

      log("order created reference=%s vendorId=%s", order.reference, vendorId)
    } catch (err) {
      log("order create failed — rolling back vendorId=%s err=%o", vendorId, err)
      await Promise.all([
        UserModel.findByIdAndUpdate(vendorId, { $inc: { walletBalance: price } }),
        order ? OrderModel.deleteOne({ _id: order._id }) : Promise.resolve(),
      ]);
      throw err;
    }

    if (settings.autoSendVendors) {
      log("autoSendVendors enabled — calling tryAutoSend reference=%s", order.reference)
      await tryAutoSend(order._id, order.customerPhone, bundle.jaybartPackageId);
    }

    return Response.json(
      {
        reference: order.reference,
        bundleName: effectiveBundleName(bundle),
        network: bundle.network,
        validityDays: bundle.validityDays,
        amountGhs: price,
      },
      { status: 201 }
    );
  } catch (err) {
    log("error %o", err)
    return createErrorResponse("SomethingWentWrong");
  }
};
