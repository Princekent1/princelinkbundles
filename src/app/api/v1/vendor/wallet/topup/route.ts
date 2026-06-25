import connectMongo from "@/lib/mongo";
import { WalletTopupModel } from "@/lib/models/wallet-topup";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { initializeTransaction, generateTopupReference } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { calculatePaystackFee } from "@/lib/paystack-fees";

const MAX_TOPUP_GHS = 500_000; // GHS 5,000 in pesewas

export const POST = async (req: Request) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor" || user.status !== "approved") return createErrorResponse("Forbidden");

  try {
    const body = await req.json().catch(() => ({}));
    const { amountGhs } = body;

    if (!amountGhs || typeof amountGhs !== "number" || !Number.isInteger(amountGhs) || amountGhs < 100) {
      return Response.json({ message: "amountGhs must be a positive integer in pesewas (minimum 100)" }, { status: 400 });
    }
    if (amountGhs > MAX_TOPUP_GHS) {
      return Response.json({ message: "Maximum top-up is GHS 5,000 per transaction" }, { status: 400 });
    }

    await connectMongo();
    const settings = await getSettings();
    const fee = calculatePaystackFee(amountGhs, settings.passPaystackFeesToCustomers);

    let reference = generateTopupReference();
    for (let i = 0; i < 4; i++) {
      if (!(await WalletTopupModel.exists({ reference }))) break;
      reference = generateTopupReference();
    }

    const topup = await WalletTopupModel.create({
      vendorId: user._id,
      reference,
      amountGhs,
      processingFeeGhs: fee.processingFeeGhs,
      totalPaidGhs: fee.totalPayableGhs,
      processingFeeRateBps: fee.processingFeeRateBps,
      status: "pending",
    });

    const origin = new URL(req.url).origin;

    const paystack = await initializeTransaction({
      email: user.email,
      amount: fee.totalPayableGhs,
      reference: topup.reference,
      callback_url: `${origin}/vendor/wallet?topup=success`,
      metadata: {
        topupRef: topup.reference,
        vendorId: String(user._id),
        walletCreditGhs: fee.baseAmountGhs,
        processingFeeGhs: fee.processingFeeGhs,
        totalPayableGhs: fee.totalPayableGhs,
      },
    });

    return Response.json({
      paystackUrl: paystack.authorization_url,
      reference: topup.reference,
      amountGhs: topup.amountGhs,
      processingFeeGhs: topup.processingFeeGhs ?? 0,
      totalPaidGhs: topup.totalPaidGhs ?? topup.amountGhs,
    }, { status: 201 });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
