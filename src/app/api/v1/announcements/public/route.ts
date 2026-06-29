import { AnnouncementModel } from "@/lib/models/announcement";
import connectMongo from "@/lib/mongo";

export const GET = async () => {
  try {
    await connectMongo();

    const announcements = await AnnouncementModel.find({
      isActive: true,
      audience: "public",
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
    return Response.json({ announcements: [] });
  }
};
