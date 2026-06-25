import { createLogger } from "@/lib/logger";
import connectMongo from "@/lib/mongo";

const log = createLogger("orders:guest")
import { BundleModel } from "@/lib/models/bundle";
import { OrderModel } from "@/lib/models/order";
import { deriveBundleName } from "@/lib/bundle-name";
import { initializeTransaction } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { calculatePaystackFee } from "@/lib/paystack-fees";

function generateReference(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "OR";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) result += chars[b % 62];
  return result;
}

export const POST = async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { bundleId, customerPhone, customerEmail } = body;

    if (!bundleId || typeof bundleId !== "string") {
      return Response.json({ message: "bundleId is required" }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== "string" || customerPhone.trim().length < 10) {
      return Response.json({ message: "A valid customerPhone is required" }, { status: 400 });
    }

    log("create bundleId=%s phone=%s", bundleId, customerPhone)

    await connectMongo();

    const bundle = await BundleModel.findOne({ _id: bundleId, archivedAt: null }).lean();
    if (!bundle) {
      log("bundle not found bundleId=%s", bundleId)
      return Response.json({ message: "Bundle not found or unavailable" }, { status: 404 });
    }

    const settings = await getSettings();
    const fee = calculatePaystackFee(bundle.priceGhs, settings.passPaystackFeesToCustomers);

    let reference = generateReference();
    for (let i = 0; i < 4; i++) {
      if (!(await OrderModel.exists({ reference }))) break;
      reference = generateReference();
    }

    const order = await OrderModel.create({
      reference,
      placedBy: null,
      paymentMethod: "paystack",
      customerPhone: customerPhone.replace(/\s/g, ""),
      customerEmail: customerEmail?.trim() || null,
      bundleId: bundle._id,
      bundleNameSnapshot: deriveBundleName(bundle.volumeMb),
      networkSnapshot: bundle.network,
      amountGhs: bundle.priceGhs,
      priceType: "public",
      processingFeeGhs: fee.processingFeeGhs,
      totalPaidGhs: fee.totalPayableGhs,
      processingFeeRateBps: fee.processingFeeRateBps,
      status: "pending_payment",
    });

    log("order created reference=%s", order.reference)

    const origin = new URL(req.url).origin;
    const email = customerEmail?.trim() || "guest@princekventures.com";

    const paystack = await initializeTransaction({
      email,
      amount: fee.totalPayableGhs,
      reference: order.reference,
      callback_url: `${origin}/checkout/success?ref=${order.reference}`,
      metadata: {
        orderRef: order.reference,
        customerPhone: order.customerPhone,
        baseAmountGhs: fee.baseAmountGhs,
        processingFeeGhs: fee.processingFeeGhs,
        totalPayableGhs: fee.totalPayableGhs,
      },
    });

    log("paystack transaction initialized reference=%s", order.reference)

    return Response.json(
      {
        reference: order.reference,
        paystackUrl: paystack.authorization_url,
        amountGhs: order.amountGhs,
        processingFeeGhs: order.processingFeeGhs ?? 0,
        totalPaidGhs: order.totalPaidGhs ?? order.amountGhs,
      },
      { status: 201 }
    );
  } catch (err) {
    log("error %o", err)
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
