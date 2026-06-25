import { OrderModel } from "./models/order";
import { checkTransaction } from "./jaybart";
import { createLogger } from "./logger";
import connectMongo from "./mongo";
import mongoose from "mongoose";

const log = createLogger("sync-jaybart");

export async function syncJaybartOrder(orderId: mongoose.Types.ObjectId): Promise<{ status: string }> {
  await connectMongo();

  const order = await OrderModel.findById(orderId).select("status jaybartTransactionCode").lean();

  const syncable =
    order?.status === "fulfilling" ||
    (order?.status === "failed" && !!order.jaybartTransactionCode);

  if (!order || !syncable) {
    return { status: order?.status ?? "unknown" };
  }

  if (!order.jaybartTransactionCode) {
    log("syncJaybartOrder skipped — no transaction code orderId=%s", orderId);
    return { status: order.status };
  }

  log("syncJaybartOrder checking txn=%s orderId=%s", order.jaybartTransactionCode, orderId);

  const txn = await checkTransaction(order.jaybartTransactionCode);
  const itemStatus = txn.order_items?.[0]?.status;

  log("syncJaybartOrder jaybartStatus=%s orderId=%s", itemStatus, orderId);

  if (itemStatus === "DELIVERED") {
    await OrderModel.updateOne(
      { _id: orderId },
      { status: "completed", completedAt: new Date(), jaybartError: null }
    );
    return { status: "completed" };
  }

  if (itemStatus === "FAILED" || itemStatus === "CANCELLED") {
    await OrderModel.updateOne(
      { _id: orderId },
      { status: "failed", failedAt: new Date(), jaybartError: `Jaybart: ${itemStatus}` }
    );
    return { status: "failed" };
  }

  return { status: "fulfilling" };
}
