import { SettingsModel } from "@/lib/models/settings";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    await connectMongo();
    const doc = await SettingsModel.findOne().lean();
    return Response.json({ contactPhone: doc?.contactPhone ?? "" });
  } catch {
    return Response.json({ contactPhone: "" });
  }
};
