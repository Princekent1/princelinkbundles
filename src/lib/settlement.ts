import mongoose from "mongoose";
import { createLogger } from "@/lib/logger";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { VendorSignupFeeModel } from "@/lib/models/vendor-signup-fee";
import { BundleModel, type Bundle } from "@/lib/models/bundle";
import { getSettings } from "@/lib/models/settings";
import { tryAutoSend } from "@/lib/auto-send";

const log = createLogger("settlement");

// "This payment is confirmed / failed" steps for FloatVault. Its webhook and the polling fallbacks all land
// here; the status-guarded updates make each one idempotent. (The Paystack webhook keeps its own handlers.)

export async function settleOrderPaid(reference: string, providerFields: Record<string, unknown> = {}) {
  log("settleOrderPaid reference=%s", reference);
  const order = await OrderModel.findOneAndUpdate(
    { reference, status: "pending_payment" },
    { status: "paid", paidAt: new Date(), ...providerFields },
    { new: true },
  ).populate<{ bundleId: Bundle & { _id: mongoose.Types.ObjectId } }>({ path: "bundleId", model: BundleModel, select: "jaybartPackageId" });

  if (!order) {
    log("settleOrderPaid order not found or not pending_payment reference=%s", reference);
    return null;
  }

  const settings = await getSettings();
  const isVendor = Boolean(order.placedBy);
  const shouldAutoSend = isVendor ? settings.autoSendVendors : settings.autoSendGuests;
  log("settleOrderPaid orderId=%s isVendor=%s shouldAutoSend=%s", order._id, isVendor, shouldAutoSend);

  if (shouldAutoSend) {
    const bundle = order.bundleId as (Bundle & { _id: mongoose.Types.ObjectId }) | null;
    await tryAutoSend(order._id, order.customerPhone, bundle?.jaybartPackageId);
  }
  return order;
}

// no money was taken, so this is a cancellation rather than a fulfillment failure
export async function cancelUnpaidOrder(reference: string, reason: string) {
  return OrderModel.findOneAndUpdate(
    { reference, status: "pending_payment" },
    { status: "cancelled", cancelledAt: new Date(), failureReason: reason },
    { new: true },
  );
}

export async function settleTopupPaid(reference: string, providerFields: Record<string, unknown>, note: string) {
  const topup = await WalletTopupModel.findOneAndUpdate(
    { reference, status: "pending" },
    { status: "success", paidAt: new Date(), ...providerFields },
  );
  if (!topup) return null;

  const updatedUser = await UserModel.findByIdAndUpdate(topup.vendorId, { $inc: { walletBalance: topup.amountGhs } }, { new: true });
  if (!updatedUser) return null;

  await WalletTransactionModel.create({
    vendorId: topup.vendorId,
    type: "topup",
    amountGhs: topup.amountGhs,
    balanceAfter: updatedUser.walletBalance,
    relatedTopupId: topup._id,
    note,
  });
  return topup;
}

export async function failTopup(reference: string) {
  return WalletTopupModel.updateOne({ reference, status: "pending" }, { status: "failed" });
}

export async function settleSignupFeePaid(reference: string, providerFields: Record<string, unknown> = {}) {
  const fee = await VendorSignupFeeModel.findOneAndUpdate(
    { reference, status: "pending" },
    { status: "success", paidAt: new Date(), ...providerFields },
    { new: true },
  );
  if (!fee) return null;

  const settings = await getSettings();
  if (settings.autoApproveVendors) {
    await UserModel.findByIdAndUpdate(fee.vendorId, { status: "approved", approvedAt: new Date() });
  }
  return fee;
}

export async function failSignupFee(reference: string) {
  return VendorSignupFeeModel.updateOne({ reference, status: "pending" }, { status: "failed" });
}
