import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { SettingsModel } from "@/lib/models/settings";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");

    await connectMongo();
    const doc = await SettingsModel.findOne().lean();
    return Response.json({ whatsappCommunityUrl: doc?.whatsappCommunityUrl ?? "" });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
