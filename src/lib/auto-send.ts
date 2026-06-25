import { OrderModel } from "./models/order";
import { sendBundle } from "./jaybart";
import { createLogger } from "./logger";
import mongoose from "mongoose";

const log = createLogger("auto-send")

export async function tryAutoSend(
  orderId: mongoose.Types.ObjectId,
  customerPhone: string,
  jaybartPackageId: number | null | undefined,
): Promise<void> {
  log("tryAutoSend orderId=%s phone=%s packageId=%s", orderId, customerPhone, jaybartPackageId)

  if (!jaybartPackageId) {
    log("tryAutoSend skipped — no jaybartPackageId")
    return;
  }

  const claimed = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: "paid" },
    { status: "fulfilling" }
  );
  if (!claimed) {
    log("tryAutoSend skipped — order not in paid status orderId=%s", orderId)
    return;
  }

  log("tryAutoSend claimed orderId=%s, calling sendBundle", orderId)

  try {
    const result = await sendBundle(customerPhone, jaybartPackageId);
    if (result.success) {
      log("tryAutoSend success orderId=%s txCode=%s — staying fulfilling until DELIVERED", orderId, result.transaction_code)
      await OrderModel.updateOne(
        { _id: orderId },
        {
          jaybartTransactionCode: result.transaction_code ?? null,
          jaybartError: null,
        }
      );
    } else {
      log("tryAutoSend rejected orderId=%s message=%s", orderId, result.message)
      await OrderModel.updateOne(
        { _id: orderId },
        { status: "paid", jaybartError: result.message ?? "Jaybart rejected the order" }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jaybart auto-send failed";
    log("tryAutoSend error orderId=%s message=%s", orderId, message)
    await OrderModel.updateOne({ _id: orderId }, { status: "paid", jaybartError: message });
  }
}
