import mongoose from "mongoose";

export type Order = {
  reference: string;
  placedBy?: mongoose.Types.ObjectId | null;
  paymentMethod: "paystack" | "wallet";
  customerPhone: string;
  customerEmail?: string | null;
  bundleId: mongoose.Types.ObjectId;
  bundleNameSnapshot: string;
  networkSnapshot: "mtn" | "telecel" | "airteltigo";
  amountGhs: number; // pesewas
  priceType?: "public" | "vendor"; // which pricing tier was applied
  processingFeeGhs?: number;
  totalPaidGhs?: number;
  processingFeeRateBps?: number;
  paystackAmountGhs?: number | null;
  status: "pending_payment" | "paid" | "fulfilling" | "completed" | "failed" | "cancelled" | "refunded";
  paystackReference?: string | null;
  jaybartTransactionCode?: string | null;
  jaybartError?: string | null;
  paidAt?: Date | null;
  completedAt?: Date | null;
  completedBy?: mongoose.Types.ObjectId | null;
  failedAt?: Date | null;
  failedBy?: mongoose.Types.ObjectId | null;
  failureReason?: string | null;
  refundedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const schema = new mongoose.Schema<Order>(
  {
    reference: { type: String, required: true, unique: true },
    placedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paymentMethod: { type: String, enum: ["paystack", "wallet"], required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, default: null },
    bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "Bundle", required: true },
    bundleNameSnapshot: { type: String, required: true },
    networkSnapshot: { type: String, enum: ["mtn", "telecel", "airteltigo"], required: true },
    amountGhs: { type: Number, required: true }, // pesewas
    priceType: { type: String, enum: ["public", "vendor"], default: null },
    processingFeeGhs: { type: Number, default: 0 },
    totalPaidGhs: { type: Number, default: undefined },
    processingFeeRateBps: { type: Number, default: 0 },
    paystackAmountGhs: { type: Number, default: null },
    status: {
      type: String,
      enum: ["pending_payment", "paid", "fulfilling", "completed", "failed", "cancelled", "refunded"],
      default: "pending_payment",
    },
    paystackReference: { type: String, default: null },
    jaybartTransactionCode: { type: String, default: null },
    jaybartError: { type: String, default: null },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    failedAt: { type: Date, default: null },
    failedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    failureReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

schema.index({ placedBy: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ networkSnapshot: 1, createdAt: -1 });
schema.index({ paymentMethod: 1, createdAt: -1 });
schema.index({ createdAt: -1 });
schema.index({ customerPhone: 1 });

export const OrderModel =
  mongoose.models.Order || mongoose.model<Order>("Order", schema);
