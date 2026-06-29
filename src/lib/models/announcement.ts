import mongoose from "mongoose";

export type Announcement = {
  title: string;
  body?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audience: ("public" | "vendor")[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const schema = new mongoose.Schema<Announcement>(
  {
    title: { type: String, required: true },
    body: { type: String, default: null },
    ctaLabel: { type: String, default: null },
    ctaUrl: { type: String, default: null },
    audience: [{ type: String, enum: ["public", "vendor"] }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

schema.index({ isActive: 1, audience: 1, createdAt: 1 });

export const AnnouncementModel =
  mongoose.models.Announcement ||
  mongoose.model<Announcement>("Announcement", schema);
