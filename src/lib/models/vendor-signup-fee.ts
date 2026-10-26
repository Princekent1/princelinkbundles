import mongoose from "mongoose";

export type VendorSignupFee = {
  vendorId: mongoose.Types.ObjectId;
  reference: string;
  amountGhs: number; // pesewas
  status: "pending" | "success" | "failed";
  channel?: "paystack" | "floatvault";
  paystackReference?: string | null;
  floatvaultReference?: string | null;
  floatvaultCheckoutUrl?: string | null;
  floatvaultAmountGhs?: number | null;
  paystackAmountGhs?: number | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const schema = new mongoose.Schema<VendorSignupFee>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reference: { type: String, required: true, unique: true },
    amountGhs: { type: Number, required: true }, // pesewas
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    channel: { type: String, enum: ["paystack", "floatvault"], default: "paystack" },
    paystackReference: { type: String, default: null },
    floatvaultReference: { type: String, default: null },
    floatvaultCheckoutUrl: { type: String, default: null },
    floatvaultAmountGhs: { type: Number, default: null },
    paystackAmountGhs: { type: Number, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ vendorId: 1, createdAt: -1 });

export const VendorSignupFeeModel =
  mongoose.models.VendorSignupFee || mongoose.model<VendorSignupFee>("VendorSignupFee", schema);

export async function getLatestSignupFee(vendorId: string | mongoose.Types.ObjectId) {
  return VendorSignupFeeModel.findOne({ vendorId }).sort({ createdAt: -1 }).lean();
}
