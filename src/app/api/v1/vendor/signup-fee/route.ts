import connectMongo from "@/lib/mongo";
import { VendorSignupFeeModel, getLatestSignupFee } from "@/lib/models/vendor-signup-fee";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { initializeTransaction, generateSignupFeeReference } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { startHostedCheckout } from "@/lib/floatvault-charge";
import { syncSignupFee } from "@/lib/signup-fee-sync";
import { failSignupFee } from "@/lib/settlement";

export const GET = async () => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor") return createErrorResponse("Forbidden");

  try {
    await connectMongo();
    const settings = await getSettings();

    if (!settings.requireVendorSignupFee) {
      return Response.json({ required: false, amountGhs: 0, status: "not_required", reference: null });
    }

    const fee = await getLatestSignupFee(user._id);

    return Response.json({
      required: true,
      amountGhs: settings.vendorSignupFeeGhs,
      status: fee?.status ?? "unpaid",
      reference: fee?.reference ?? null,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const POST = async (req: Request) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor") return createErrorResponse("Forbidden");
  if (user.status !== "pending") return createErrorResponse("Forbidden");

  try {
    await connectMongo();
    const settings = await getSettings();

    if (!settings.requireVendorSignupFee) {
      return Response.json({ message: "Signup fee is not required" }, { status: 400 });
    }
    if (!settings.vendorSignupFeeGhs || settings.vendorSignupFeeGhs <= 0) {
      return Response.json({ message: "Signup fee amount is not configured" }, { status: 400 });
    }

    const alreadyPaid = await VendorSignupFeeModel.exists({ vendorId: user._id, status: "success" });
    if (alreadyPaid) return Response.json({ alreadyPaid: true });

    const previous = await getLatestSignupFee(user._id);
    if (previous?.status === "pending") {
      const synced = await syncSignupFee(previous);
      if (synced.status === "success") return Response.json({ alreadyPaid: true });
      await failSignupFee(previous.reference);
    }

    let reference = generateSignupFeeReference();
    for (let i = 0; i < 4; i++) {
      if (!(await VendorSignupFeeModel.exists({ reference }))) break;
      reference = generateSignupFeeReference();
    }

    const fee = await VendorSignupFeeModel.create({
      vendorId: user._id,
      reference,
      amountGhs: settings.vendorSignupFeeGhs,
      channel: settings.paymentMode === "floatvault" ? "floatvault" : "paystack",
      status: "pending",
    });

    const origin = new URL(req.url).origin;

    if (settings.paymentMode === "floatvault") {
      try {
        const payment = await startHostedCheckout({
          reference: fee.reference,
          kind: "signupfee",
          amountGhs: fee.amountGhs,
          callbackUrl: `${origin}/vendor/signup-fee?fee=success&ref=${fee.reference}`,
        });
        await VendorSignupFeeModel.updateOne({ _id: fee._id }, { floatvaultReference: payment.reference, floatvaultCheckoutUrl: payment.checkoutUrl });
        return Response.json({ provider: "floatvault", checkoutUrl: payment.checkoutUrl, reference: fee.reference, amountGhs: fee.amountGhs }, { status: 201 });
      } catch {
        await VendorSignupFeeModel.updateOne({ _id: fee._id, status: "pending" }, { status: "failed" });
        return Response.json({ message: "We couldn't start the payment. Please try again." }, { status: 502 });
      }
    }

    const paystack = await initializeTransaction({
      email: user.email,
      amount: fee.amountGhs,
      reference: fee.reference,
      callback_url: `${origin}/vendor/signup-fee?fee=success`,
      metadata: {
        signupFeeRef: fee.reference,
        vendorId: String(user._id),
      },
    });

    return Response.json({
      paystackUrl: paystack.authorization_url,
      reference: fee.reference,
      amountGhs: fee.amountGhs,
    }, { status: 201 });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
