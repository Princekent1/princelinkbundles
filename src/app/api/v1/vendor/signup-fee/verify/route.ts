import connectMongo from "@/lib/mongo";
import { VendorSignupFeeModel } from "@/lib/models/vendor-signup-fee";
import { UserModel } from "@/lib/models/user";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { verifyTransaction } from "@/lib/paystack";
import { getSettings } from "@/lib/models/settings";
import { syncFloatVaultSignupFee } from "@/lib/floatvault-sync";
import mongoose from "mongoose";

export const POST = async (req: Request) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor") return createErrorResponse("Forbidden");

  const body = await req.json().catch(() => ({}));
  const { reference } = body;

  if (!reference || typeof reference !== "string") {
    return Response.json({ message: "reference is required" }, { status: 400 });
  }

  try {
    await connectMongo();

    const fee = await VendorSignupFeeModel.findOne({
      reference,
      vendorId: new mongoose.Types.ObjectId(user._id),
    });

    if (!fee) {
      return Response.json({ message: "Signup fee payment not found" }, { status: 404 });
    }

    if (fee.status !== "pending") {
      return Response.json({ alreadyProcessed: true, status: fee.status });
    }

    if (fee.channel === "floatvault") {
      const result = await syncFloatVaultSignupFee(reference);
      if (result.status === "success") {
        const user = await UserModel.findById(fee.vendorId).select("status").lean();
        return Response.json({ paid: true, approved: user?.status === "approved" });
      }
      if (result.status === "failed") return Response.json({ alreadyProcessed: true, status: "failed" });
      return Response.json({ paid: false, checkoutUrl: fee.floatvaultCheckoutUrl ?? null, paystackStatus: "pending" });
    }

    const paystackResult = await verifyTransaction(reference);

    if (paystackResult.status !== "success") {
      return Response.json({ paid: false, paystackStatus: paystackResult.status });
    }

    const claimed = await VendorSignupFeeModel.findOneAndUpdate(
      { _id: fee._id, status: "pending" },
      {
        status: "success",
        paidAt: new Date(),
        paystackReference: reference,
        paystackAmountGhs: paystackResult.amount,
      }
    );

    if (!claimed) {
      return Response.json({ alreadyProcessed: true, status: "success" });
    }

    const settings = await getSettings();
    let approved = false;
    if (settings.autoApproveVendors) {
      await UserModel.findByIdAndUpdate(fee.vendorId, { status: "approved", approvedAt: new Date() });
      approved = true;
    }

    return Response.json({ paid: true, approved });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
