import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { AnnouncementModel } from "@/lib/models/announcement";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "vendor" || authUser.status !== "approved") {
      return createErrorResponse("Forbidden");
    }

    await connectMongo();

    const announcements = await AnnouncementModel.find({
      isActive: true,
      audience: "vendor",
    })
      .sort({ createdAt: 1 })
      .lean();

    return Response.json({
      announcements: announcements.map((a) => ({
        _id: a._id.toString(),
        title: a.title,
        body: a.body ?? null,
        ctaLabel: a.ctaLabel ?? null,
        ctaUrl: a.ctaUrl ?? null,
      })),
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
