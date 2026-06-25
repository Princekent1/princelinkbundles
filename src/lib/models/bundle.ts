import mongoose from "mongoose";

export type Bundle = {
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  volumeMb: number;
  validityDays: number;
  priceGhs: number; // pesewas — public (guest) price
  vendorPriceGhs?: number | null; // pesewas — reseller price; null = same as priceGhs
  sortOrder: number;
  jaybartPackageId?: number | null;
  jaybartNetworkId?: number | null;
  jaybartCostGhs?: number | null; // pesewas — what Jaybart charges (console_price × 100)
  archivedAt?: Date | null;
  archivedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function effectiveVendorPrice(bundle: Pick<Bundle, "priceGhs" | "vendorPriceGhs">): number {
  return bundle.vendorPriceGhs ?? bundle.priceGhs;
}

const schema = new mongoose.Schema<Bundle>(
  {
    network: { type: String, enum: ["mtn", "telecel", "airteltigo"], required: true },
    name: { type: String, required: true },
    volumeMb: { type: Number, required: true },
    validityDays: { type: Number, required: true },
    priceGhs: { type: Number, required: true }, // pesewas — public price
    vendorPriceGhs: { type: Number, default: null }, // pesewas — reseller price
    sortOrder: { type: Number, default: 0 },
    jaybartPackageId: { type: Number, default: null },
    jaybartNetworkId: { type: Number, default: null },
    jaybartCostGhs: { type: Number, default: null }, // pesewas
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

schema.index({ network: 1, sortOrder: 1 });
schema.index({ archivedAt: 1 });

export const BundleModel =
  mongoose.models.Bundle || mongoose.model<Bundle>("Bundle", schema);
