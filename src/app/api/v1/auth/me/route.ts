import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
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

    return Response.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        walletBalance: user.walletBalance ?? 0,
        role: user.role,
        status: user.status,
      },
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
