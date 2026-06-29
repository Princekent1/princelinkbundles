import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { AnnouncementModel } from "@/lib/models/announcement";
import connectMongo from "@/lib/mongo";
import { type NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const statusParam = req.nextUrl.searchParams.get("status");
    const filter =
      statusParam === "hidden" ? { isActive: false } : { isActive: true };

    const announcements = await AnnouncementModel.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    const [activeCount, hiddenCount] = await Promise.all([
      AnnouncementModel.countDocuments({ isActive: true }),
      AnnouncementModel.countDocuments({ isActive: false }),
    ]);

    return Response.json({
      announcements: announcements.map((a) => ({
        _id: a._id.toString(),
        title: a.title,
        body: a.body ?? null,
        ctaLabel: a.ctaLabel ?? null,
        ctaUrl: a.ctaUrl ?? null,
        audience: a.audience,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
      counts: { active: activeCount, hidden: hiddenCount },
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const POST = async (req: Request) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const body = await req.json().catch(() => ({}));
    const { title, body: text, ctaLabel, ctaUrl, audience, isActive } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return createErrorResponse("ValidationError", "title is required");
    }
    if (
      !Array.isArray(audience) ||
      audience.length === 0 ||
      !audience.every((a: unknown) => a === "public" || a === "vendor")
    ) {
      return createErrorResponse(
        "ValidationError",
        "audience must be a non-empty array of 'public' and/or 'vendor'"
      );
    }

    await connectMongo();

    const announcement = await AnnouncementModel.create({
      title: title.trim(),
      body: typeof text === "string" && text.trim() ? text.trim() : null,
      ctaLabel:
        typeof ctaLabel === "string" && ctaLabel.trim()
          ? ctaLabel.trim()
          : null,
      ctaUrl:
        typeof ctaUrl === "string" && ctaUrl.trim() ? ctaUrl.trim() : null,
      audience,
      isActive: isActive !== false,
    });

    return Response.json(
      {
        _id: announcement._id.toString(),
        title: announcement.title,
        body: announcement.body ?? null,
        ctaLabel: announcement.ctaLabel ?? null,
        ctaUrl: announcement.ctaUrl ?? null,
        audience: announcement.audience,
        isActive: announcement.isActive,
        createdAt: announcement.createdAt,
      },
      { status: 201 }
    );
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
