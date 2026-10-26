import connectMongo from "@/lib/mongo";
import { VendorSignupFeeModel } from "@/lib/models/vendor-signup-fee";
import { UserModel } from "@/lib/models/user";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";
import { syncSignupFee } from "@/lib/signup-fee-sync";
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

    const result = await syncSignupFee(fee);

    if (result.status === "failed") return Response.json({ alreadyProcessed: true, status: "failed" });

    if (result.status === "success") {
      const vendor = await UserModel.findById(fee.vendorId).select("status").lean();
      return Response.json({ paid: true, approved: vendor?.status === "approved" });
    }

    return Response.json({
      paid: false,
      checkoutUrl: fee.floatvaultCheckoutUrl ?? null,
      paystackStatus: result.providerStatus ?? "pending",
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
