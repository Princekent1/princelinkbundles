import { createLogger } from "@/lib/logger";
import connectMongo from "@/lib/mongo";

const log = createLogger("webhook")
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { PaymentEventModel } from "@/lib/models/payment-event";
import { BundleModel, type Bundle } from "@/lib/models/bundle";
import { verifyWebhookSignature } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { tryAutoSend } from "@/lib/auto-send";
import mongoose from "mongoose";

export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    log("invalid signature")
    return Response.json({ message: "Invalid signature" }, { status: 400 });
  }

  let payload: { event: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log("invalid payload — JSON parse failed")
    return Response.json({ message: "Invalid payload" }, { status: 400 });
  }

  const paystackEventId = String(payload.data.id);
  log("received event=%s paystackEventId=%s", payload.event, paystackEventId)

  await connectMongo();

  try {
    await PaymentEventModel.create({
      paystackEventId,
      eventType: payload.event,
      rawPayload: payload,
      processed: false,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      log("duplicate event paystackEventId=%s — skipping", paystackEventId)
      return Response.json({ received: true });
    }
    log("failed to create PaymentEvent paystackEventId=%s err=%o", paystackEventId, err)
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }

  let processed = false;

  if (payload.event === "charge.success") {
    const reference = String(payload.data.reference);
    log("charge.success reference=%s", reference)
    try {
      const paystackAmountGhs = typeof payload.data.amount === "number" ? payload.data.amount : null;
      if (reference.startsWith("TP")) {
        await handleTopupSuccess(reference, paystackEventId, paystackAmountGhs);
      } else {
        await handleOrderSuccess(reference, paystackAmountGhs);
      }
      processed = true;
    } catch (err) {
      log("charge.success handler error reference=%s err=%o", reference, err)
      // leave processed: false so the event can be identified and retried manually
    }
  } else if (payload.event === "charge.failed") {
    const reference = String(payload.data.reference);
    log("charge.failed reference=%s", reference)
    try {
      if (reference.startsWith("TP")) {
        await handleTopupFailed(reference);
      }
      processed = true;
    } catch (err) {
      log("charge.failed handler error reference=%s err=%o", reference, err)
      // leave processed: false
    }
  } else {
    log("unhandled event type=%s — marking processed", payload.event)
    processed = true;
  }

  await PaymentEventModel.updateOne({ paystackEventId }, { processed });
  log("done paystackEventId=%s processed=%s", paystackEventId, processed)

  return Response.json({ received: true });
};

async function handleOrderSuccess(reference: string, paystackAmountGhs: number | null) {
  log("handleOrderSuccess reference=%s", reference)
  const order = await OrderModel.findOneAndUpdate(
    { reference, status: "pending_payment" },
    {
      status: "paid",
      paidAt: new Date(),
      paystackReference: reference,
      ...(paystackAmountGhs !== null ? { paystackAmountGhs } : {}),
    },
    { new: true }
  ).populate<{ bundleId: Bundle & { _id: mongoose.Types.ObjectId } }>({ path: "bundleId", model: BundleModel, select: "jaybartPackageId" });

  if (!order) {
    log("handleOrderSuccess order not found or not pending_payment reference=%s", reference)
    return;
  }

  const settings = await getSettings();
  const isVendor = Boolean(order.placedBy);
  const shouldAutoSend = isVendor ? settings.autoSendVendors : settings.autoSendGuests;
  log("handleOrderSuccess orderId=%s isVendor=%s shouldAutoSend=%s", order._id, isVendor, shouldAutoSend)

  if (!shouldAutoSend) return;

  const bundle = order.bundleId as (Bundle & { _id: mongoose.Types.ObjectId }) | null;
  await tryAutoSend(order._id, order.customerPhone, bundle?.jaybartPackageId);
}

async function handleTopupFailed(reference: string) {
  await WalletTopupModel.updateOne(
    { reference, status: "pending" },
    { status: "failed" }
  );
}

async function handleTopupSuccess(reference: string, paystackEventId: string, paystackAmountGhs: number | null) {
  const topup = await WalletTopupModel.findOne({ reference, status: "pending" });
  if (!topup) return;

  const updatedUser = await UserModel.findByIdAndUpdate(
    topup.vendorId,
    { $inc: { walletBalance: topup.amountGhs } },
    { new: true }
  );
  if (!updatedUser) return;

  await Promise.all([
    WalletTransactionModel.create({
      vendorId: topup.vendorId,
      type: "topup",
      amountGhs: topup.amountGhs,
      balanceAfter: updatedUser.walletBalance,
      relatedTopupId: topup._id,
      note: `Paystack ref: ${paystackEventId}`,
    }),
    WalletTopupModel.updateOne(
      { _id: topup._id },
      {
        status: "success",
        paystackReference: reference,
        paidAt: new Date(),
        ...(paystackAmountGhs !== null ? { paystackAmountGhs } : {}),
      }
    ),
  ]);
}
