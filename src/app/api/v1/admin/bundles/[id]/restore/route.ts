import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { BundleModel } from "@/lib/models/bundle";
import connectMongo from "@/lib/mongo";

export const PATCH = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    await connectMongo();

    const bundle = await BundleModel.findOneAndUpdate(
      { _id: id, archivedAt: { $ne: null } },
      { $set: { archivedAt: null, archivedBy: null } },
      { new: true }
    );

    if (!bundle) return createErrorResponse("NotFound");

    return Response.json({ _id: bundle._id.toString(), archivedAt: null });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
