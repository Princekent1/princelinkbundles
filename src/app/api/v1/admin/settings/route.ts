import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { SettingsModel } from "@/lib/models/settings";
import connectMongo from "@/lib/mongo";
import { checkBalance } from "@/lib/jaybart";
import { PAYSTACK_FEE_RATE_BPS } from "@/lib/paystack-fees";
import { quoteFees } from "@/lib/floatvault";

// FloatVault's own fee policy, shown next to the Paystack flag; null when it can't be reached
const FEE_PROBE_GHS = 10_000;

async function getFloatVaultFeePolicy(): Promise<{ feePayer: "customer" | "app_owner"; probeFeeGhs: number } | null> {
  try {
    const quote = await quoteFees(FEE_PROBE_GHS);
    return { feePayer: quote.feePayer, probeFeeGhs: quote.fees.total };
  } catch {
    return null;
  }
}

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const [settings, balance] = await Promise.allSettled([
      SettingsModel.findOne().lean(),
      checkBalance(),
    ]);

    const s = settings.status === "fulfilled" ? settings.value : null;
    const floatvault = s?.paymentMode === "floatvault" ? await getFloatVaultFeePolicy() : null;
    const b = balance.status === "fulfilled" ? balance.value.userWalletBalance : null;

    return Response.json({
      paymentMode: s?.paymentMode ?? "paystack",
      floatvaultFeePolicy: floatvault,
      autoSendVendors: s?.autoSendVendors ?? false,
      autoSendGuests: s?.autoSendGuests ?? false,
      autoApproveVendors: s?.autoApproveVendors ?? false,
      passPaystackFeesToCustomers: s?.passPaystackFeesToCustomers ?? false,
      contactPhone: s?.contactPhone ?? "",
      whatsappCommunityUrl: s?.whatsappCommunityUrl ?? "",
      disabledNetworks: s?.disabledNetworks ?? [],
      requireVendorSignupFee: s?.requireVendorSignupFee ?? false,
      vendorSignupFeeGhs: s?.vendorSignupFeeGhs ?? 0,
      paystackFeeRateBps: PAYSTACK_FEE_RATE_BPS,
      jaybartBalance: b,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const PATCH = async (req: Request) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const body = await req.json().catch(() => ({}));
    const update: Record<string, boolean | string | string[]> = {};
    if (typeof body.autoSendVendors === "boolean") update.autoSendVendors = body.autoSendVendors;
    if (typeof body.autoSendGuests === "boolean") update.autoSendGuests = body.autoSendGuests;
    if (typeof body.autoApproveVendors === "boolean") update.autoApproveVendors = body.autoApproveVendors;
    if (typeof body.passPaystackFeesToCustomers === "boolean") {
      update.passPaystackFeesToCustomers = body.passPaystackFeesToCustomers;
    }
    if (body.paymentMode !== undefined) {
      if (body.paymentMode !== "paystack" && body.paymentMode !== "floatvault") {
        return createErrorResponse("ValidationError", "paymentMode must be paystack or floatvault");
      }
      update.paymentMode = body.paymentMode;
    }
    if (typeof body.contactPhone === "string") update.contactPhone = body.contactPhone.trim();
    if (typeof body.whatsappCommunityUrl === "string") update.whatsappCommunityUrl = body.whatsappCommunityUrl.trim();
    if (typeof body.requireVendorSignupFee === "boolean") update.requireVendorSignupFee = body.requireVendorSignupFee;
    if (typeof body.vendorSignupFeeGhs === "number" && Number.isInteger(body.vendorSignupFeeGhs) && body.vendorSignupFeeGhs >= 0) {
      update.vendorSignupFeeGhs = body.vendorSignupFeeGhs;
    }
    if (Array.isArray(body.disabledNetworks)) {
      const VALID_NETWORKS = ["mtn", "telecel", "airteltigo"];
      update.disabledNetworks = body.disabledNetworks.filter(
        (n: unknown) => typeof n === "string" && VALID_NETWORKS.includes(n)
      );
    }

    if (!Object.keys(update).length) {
      return Response.json({ message: "Nothing to update" }, { status: 400 });
    }

    await connectMongo();

    const current = await SettingsModel.findOne().lean();
    const effectiveMode = (update.paymentMode as string | undefined) ?? current?.paymentMode ?? "paystack";
    const effectivePassFees = (update.passPaystackFeesToCustomers as boolean | undefined) ?? current?.passPaystackFeesToCustomers ?? false;
    if (effectiveMode === "floatvault" && (update.paymentMode === "floatvault" || update.passPaystackFeesToCustomers === true)) {
      const policy = await getFloatVaultFeePolicy();
      if (!policy) {
        return createErrorResponse("ValidationError", "FloatVault can't be reached with the configured API URL and key, so it can't be switched on yet");
      }
      if (effectivePassFees && policy.feePayer === "customer") {
        return createErrorResponse(
          "ValidationError",
          "This would double charge fees: FloatVault is already set to charge the customer's fees. Turn off \"Pass fees to customers\" here, or change the fee payer on the FloatVault app.",
        );
      }
    }

    const settings = await SettingsModel.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return Response.json({
      paymentMode: settings!.paymentMode ?? "paystack",
      autoSendVendors: settings!.autoSendVendors,
      autoSendGuests: settings!.autoSendGuests,
      autoApproveVendors: settings!.autoApproveVendors,
      passPaystackFeesToCustomers: settings!.passPaystackFeesToCustomers ?? false,
      contactPhone: settings!.contactPhone ?? "",
      whatsappCommunityUrl: settings!.whatsappCommunityUrl ?? "",
      disabledNetworks: settings!.disabledNetworks ?? [],
      requireVendorSignupFee: settings!.requireVendorSignupFee ?? false,
      vendorSignupFeeGhs: settings!.vendorSignupFeeGhs ?? 0,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
