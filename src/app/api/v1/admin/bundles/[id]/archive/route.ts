import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { BundleModel } from "@/lib/models/bundle";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const PATCH = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    await connectMongo();

    const bundle = await BundleModel.findOneAndUpdate(
      { _id: id, archivedAt: null },
      {
        archivedAt: new Date(),
        archivedBy: new mongoose.Types.ObjectId(authUser._id),
      },
      { new: true }
    );

    if (!bundle) return createErrorResponse("NotFound");

    return Response.json({ _id: bundle._id.toString(), archivedAt: bundle.archivedAt });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
