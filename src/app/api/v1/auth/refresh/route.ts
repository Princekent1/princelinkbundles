import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { setAuthCookie } from "@/lib/auth-cookie";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import type { TokenPayload } from "@/lib/jwt";

export const POST = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");

    await connectMongo();

    const user = await UserModel.findById(authUser._id).select("email role status businessName").lean();
    if (!user) return createErrorResponse("Unauthorized");

    if (user.status === "rejected") return createErrorResponse("AccountRejected");
    if (user.status === "suspended") return createErrorResponse("AccountSuspended");

    const payload: TokenPayload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role ?? "vendor",
      status: user.status ?? "pending",
      businessName: user.businessName,
    };

    await setAuthCookie(payload);

    return Response.json({ message: "success", user: payload });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
