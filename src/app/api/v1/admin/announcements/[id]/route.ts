import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { AnnouncementModel } from "@/lib/models/announcement";
import connectMongo from "@/lib/mongo";

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { title, body: text, ctaLabel, ctaUrl, audience, isActive } = body;

    const update: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return createErrorResponse("ValidationError", "title cannot be empty");
      }
      update.title = title.trim();
    }
    if (text !== undefined) {
      update.body =
        typeof text === "string" && text.trim() ? text.trim() : null;
    }
    if (ctaLabel !== undefined) {
      update.ctaLabel =
        typeof ctaLabel === "string" && ctaLabel.trim()
          ? ctaLabel.trim()
          : null;
    }
    if (ctaUrl !== undefined) {
      update.ctaUrl =
        typeof ctaUrl === "string" && ctaUrl.trim() ? ctaUrl.trim() : null;
    }
    if (audience !== undefined) {
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
      update.audience = audience;
    }
    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    await connectMongo();

    const announcement = await AnnouncementModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!announcement) {
      return createErrorResponse("NotFound", "Announcement not found");
    }

    return Response.json({
      _id: announcement._id.toString(),
      title: announcement.title,
      body: announcement.body ?? null,
      ctaLabel: announcement.ctaLabel ?? null,
      ctaUrl: announcement.ctaUrl ?? null,
      audience: announcement.audience,
      isActive: announcement.isActive,
      createdAt: announcement.createdAt,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const DELETE = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;

    await connectMongo();

    const result = await AnnouncementModel.findByIdAndDelete(id);
    if (!result) {
      return createErrorResponse("NotFound", "Announcement not found");
    }

    return Response.json({ deleted: true });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
