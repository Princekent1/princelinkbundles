import mongoose from "mongoose";

export type WalletTransaction = {
  vendorId: mongoose.Types.ObjectId;
  type: "topup" | "purchase" | "refund" | "adjustment";
  amountGhs: number; // pesewas — positive = credit, negative = debit
  balanceAfter: number; // pesewas — snapshot at time of transaction
  relatedOrderId?: mongoose.Types.ObjectId | null;
  relatedTopupId?: mongoose.Types.ObjectId | null;
  performedBy?: mongoose.Types.ObjectId | null;
  note?: string | null;
  createdAt?: Date;
};

const schema = new mongoose.Schema<WalletTransaction>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["topup", "purchase", "refund", "adjustment"], required: true },
    amountGhs: { type: Number, required: true }, // pesewas
    balanceAfter: { type: Number, required: true }, // pesewas
    relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    relatedTopupId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTopup", default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ vendorId: 1, createdAt: -1 });

export const WalletTransactionModel =
  mongoose.models.WalletTransaction ||
  mongoose.model<WalletTransaction>("WalletTransaction", schema);
