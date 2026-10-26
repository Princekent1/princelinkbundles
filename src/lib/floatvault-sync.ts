import { createLogger } from "@/lib/logger";
import { getPayment } from "@/lib/floatvault";
import { OrderModel } from "@/lib/models/order";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { VendorSignupFeeModel } from "@/lib/models/vendor-signup-fee";
import { cancelUnpaidOrder, failSignupFee, failTopup, settleOrderPaid, settleSignupFeePaid, settleTopupPaid } from "@/lib/settlement";

const log = createLogger("floatvault-sync");

const MIN_INTERVAL_MS = 4000;
const lastChecked = new Map<string, number>();

function due(reference: string): boolean {
  const now = Date.now();
  if (now - (lastChecked.get(reference) ?? 0) < MIN_INTERVAL_MS) return false;
  lastChecked.set(reference, now);
  return true;
}

// Polling fallback for the webhook: asks FloatVault where the payment stands and settles if it has finished.
// Safe to call repeatedly; the settlement updates are status-guarded. A customer still on FloatVault's page
// (entering a code, approving the prompt) is simply still pending here.
export async function syncFloatVaultOrder(reference: string): Promise<void> {
  const order = await OrderModel.findOne({ reference }).lean();
  if (!order || order.paymentMethod !== "floatvault" || order.status !== "pending_payment" || !order.floatvaultReference) return;
  if (!due(reference)) return;

  try {
    const payment = await getPayment(order.floatvaultReference);
    log("order %s floatvault status=%s", reference, payment.status);
    if (payment.status === "success") {
      await settleOrderPaid(reference, { floatvaultAmountGhs: payment.customerPays ?? payment.amount });
    } else if (payment.status === "failed" || payment.status === "cancelled") {
      await cancelUnpaidOrder(reference, payment.failureReason ?? "Payment was not completed");
    }
  } catch (err) {
    log("order %s sync error %o", reference, err);
  }
}

export async function syncFloatVaultTopup(reference: string): Promise<{ status: string }> {
  const topup = await WalletTopupModel.findOne({ reference }).lean();
  if (!topup || topup.channel !== "floatvault" || !topup.floatvaultReference) return { status: topup?.status ?? "not_found" };
  if (topup.status !== "pending") return { status: topup.status };
  if (!due(reference)) return { status: topup.status };

  try {
    const payment = await getPayment(topup.floatvaultReference);
    log("topup %s floatvault status=%s", reference, payment.status);
    if (payment.status === "success") {
      await settleTopupPaid(reference, { floatvaultAmountGhs: payment.customerPays ?? payment.amount }, `FloatVault ref: ${topup.floatvaultReference}`);
      return { status: "success" };
    }
    if (payment.status === "failed" || payment.status === "cancelled") {
      await failTopup(reference);
      return { status: "failed" };
    }
    return { status: "pending" };
  } catch (err) {
    log("topup %s sync error %o", reference, err);
    return { status: "pending" };
  }
}

export async function syncFloatVaultSignupFee(reference: string): Promise<{ status: string }> {
  const fee = await VendorSignupFeeModel.findOne({ reference }).lean();
  if (!fee || fee.channel !== "floatvault" || !fee.floatvaultReference) return { status: fee?.status ?? "not_found" };
  if (fee.status !== "pending") return { status: fee.status };
  if (!due(reference)) return { status: fee.status };

  try {
    const payment = await getPayment(fee.floatvaultReference);
    log("signup fee %s floatvault status=%s", reference, payment.status);
    if (payment.status === "success") {
      await settleSignupFeePaid(reference, { floatvaultAmountGhs: payment.customerPays ?? payment.amount });
      return { status: "success" };
    }
    if (payment.status === "failed" || payment.status === "cancelled") {
      await failSignupFee(reference);
      return { status: "failed" };
    }
    return { status: "pending" };
  } catch (err) {
    log("signup fee %s sync error %o", reference, err);
    return { status: "pending" };
  }
}
