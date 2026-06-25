import mongoose from "mongoose";

export type WalletTopup = {
  vendorId: mongoose.Types.ObjectId;
  reference: string;
  amountGhs: number; // pesewas
  processingFeeGhs?: number;
  totalPaidGhs?: number;
  processingFeeRateBps?: number;
  paystackAmountGhs?: number | null;
  status: "pending" | "success" | "failed";
  paystackReference?: string | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const schema = new mongoose.Schema<WalletTopup>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reference: { type: String, required: true, unique: true },
    amountGhs: { type: Number, required: true }, // pesewas
    processingFeeGhs: { type: Number, default: 0 },
    totalPaidGhs: { type: Number, default: undefined },
    processingFeeRateBps: { type: Number, default: 0 },
    paystackAmountGhs: { type: Number, default: null },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    paystackReference: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ vendorId: 1 });
schema.index({ paystackReference: 1 });

export const WalletTopupModel =
  mongoose.models.WalletTopup || mongoose.model<WalletTopup>("WalletTopup", schema);
