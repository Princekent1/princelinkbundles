import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
import { getSettings } from "@/lib/models/settings";
import { getLatestSignupFee } from "@/lib/models/vendor-signup-fee";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");

    await connectMongo();

    const user = await UserModel.findById(authUser._id)
      .select("email phone businessName walletBalance role status")
      .lean();

    if (!user) return createErrorResponse("Unauthorized");

    let signupFeeRequired = false;
    let signupFeeStatus: "unpaid" | "pending" | "success" | "failed" | null = null;

    if (user.role === "vendor" && user.status === "pending") {
      const settings = await getSettings();
      signupFeeRequired = settings.requireVendorSignupFee;
      if (signupFeeRequired) {
        const fee = await getLatestSignupFee(user._id);
        signupFeeStatus = fee?.status ?? "unpaid";
      }
    }

    return Response.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        walletBalance: user.walletBalance ?? 0,
        role: user.role,
        status: user.status,
        signupFeeRequired,
        signupFeeStatus,
      },
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
