import mongoose from "mongoose";

export type User = {
  email: string;
  phone: string;
  password?: string;
  businessName?: string;
  role?: "admin" | "vendor";
  status?: "pending" | "approved" | "rejected" | "suspended";
  walletBalance?: number; // pesewas
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

const schema = new mongoose.Schema<User>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  businessName: { type: String },
  phone: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "vendor"], default: "vendor" },
  status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending" },
  walletBalance: { type: Number, default: 0 }, // pesewas
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  suspendedAt: { type: Date },
  suspendedBy: { type: mongoose.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<User>("User", schema);
