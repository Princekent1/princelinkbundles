import mongoose from "mongoose";

export type Settings = {
  autoSendVendors: boolean;
  autoSendGuests: boolean;
  autoApproveVendors: boolean;
  passPaystackFeesToCustomers: boolean;
  contactPhone: string;
  whatsappCommunityUrl: string;
  disabledNetworks: string[];
};

const schema = new mongoose.Schema<Settings>({
  autoSendVendors: { type: Boolean, default: false },
  autoSendGuests: { type: Boolean, default: false },
  autoApproveVendors: { type: Boolean, default: false },
  passPaystackFeesToCustomers: { type: Boolean, default: false },
  contactPhone: { type: String, default: "" },
  whatsappCommunityUrl: { type: String, default: "" },
  disabledNetworks: { type: [String], enum: ["mtn", "telecel", "airteltigo"], default: [] },
});

export const SettingsModel =
  mongoose.models.Settings || mongoose.model<Settings>("Settings", schema);

export async function getSettings(): Promise<Settings> {
  const doc = await SettingsModel.findOne().lean();
  return {
    autoSendVendors: doc?.autoSendVendors ?? false,
    autoSendGuests: doc?.autoSendGuests ?? false,
    autoApproveVendors: doc?.autoApproveVendors ?? false,
    passPaystackFeesToCustomers: doc?.passPaystackFeesToCustomers ?? false,
    contactPhone: doc?.contactPhone ?? "",
    whatsappCommunityUrl: doc?.whatsappCommunityUrl ?? "",
    disabledNetworks: doc?.disabledNetworks ?? [],
  };
}
