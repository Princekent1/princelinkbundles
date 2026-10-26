import connectMongo from "@/lib/mongo";
import { createLogger } from "@/lib/logger";
import { PaymentEventModel } from "@/lib/models/payment-event";
import { verifyWebhookSignature } from "@/lib/floatvault";
import { cancelUnpaidOrder, failSignupFee, failTopup, settleOrderPaid, settleSignupFeePaid, settleTopupPaid } from "@/lib/settlement";

const log = createLogger("floatvault-webhook");

type Payload = {
  event: string;
  data: { reference: string; amountMinor?: number; failureReason?: string | null; metadata?: { orderRef?: string; topupRef?: string; signupFeeRef?: string } };
};

export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const signature = req.headers.get("x-floatvault-signature") ?? "";

  if (!(await verifyWebhookSignature(rawBody, signature))) {
    log("invalid signature");
    return Response.json({ message: "Invalid signature" }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { event, data } = payload;
  log("received event=%s reference=%s", event, data?.reference);
  if (!data?.reference) return Response.json({ received: true });

  await connectMongo();

  // PaymentEvent is keyed by a provider event id; FloatVault sends none, so event + payment reference stands in
  const eventId = `floatvault:${event}:${data.reference}`;
  try {
    await PaymentEventModel.create({ paystackEventId: eventId, eventType: event, rawPayload: payload, processed: false });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return Response.json({ received: true });
    log("failed to record event %s err=%o", eventId, err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }

  let processed = false;
  try {
    const orderRef = data.metadata?.orderRef;
    const topupRef = data.metadata?.topupRef;
    const signupFeeRef = data.metadata?.signupFeeRef;

    if (event === "payment.success") {
      const providerFields = { floatvaultReference: data.reference, floatvaultAmountGhs: data.amountMinor ?? null };
      if (orderRef) await settleOrderPaid(orderRef, providerFields);
      else if (topupRef) {
        await settleTopupPaid(topupRef, providerFields, `FloatVault ref: ${data.reference}`);
      } else if (signupFeeRef) {
        await settleSignupFeePaid(signupFeeRef, providerFields);
      }
      processed = true;
    } else if (event === "payment.failed") {
      if (orderRef) await cancelUnpaidOrder(orderRef, data.failureReason ?? "Payment failed");
      else if (topupRef) await failTopup(topupRef);
      else if (signupFeeRef) await failSignupFee(signupFeeRef);
      processed = true;
    } else {
      processed = true;
    }
  } catch (err) {
    log("handler error event=%s reference=%s err=%o", event, data.reference, err);
  }

  await PaymentEventModel.updateOne({ paystackEventId: eventId }, { processed });
  return Response.json({ received: true });
};
