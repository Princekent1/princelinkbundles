import mongoose from "mongoose";

export type PaymentEvent = {
  paystackEventId: string;
  eventType: string;
  relatedOrderId?: mongoose.Types.ObjectId | null;
  relatedTopupId?: mongoose.Types.ObjectId | null;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  processed: boolean;
};

const schema = new mongoose.Schema<PaymentEvent>(
  {
    paystackEventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    relatedTopupId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTopup", default: null },
    rawPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false },
  },
  { timestamps: false }
);

schema.index({ processed: 1 });

export const PaymentEventModel =
  mongoose.models.PaymentEvent ||
  mongoose.model<PaymentEvent>("PaymentEvent", schema);
