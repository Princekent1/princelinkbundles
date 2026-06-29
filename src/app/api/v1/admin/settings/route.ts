import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { SettingsModel } from "@/lib/models/settings";
import connectMongo from "@/lib/mongo";
import { checkBalance } from "@/lib/jaybart";
import { PAYSTACK_FEE_RATE_BPS } from "@/lib/paystack-fees";

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
    const b = balance.status === "fulfilled" ? balance.value.userWalletBalance : null;

    return Response.json({
      autoSendVendors: s?.autoSendVendors ?? false,
      autoSendGuests: s?.autoSendGuests ?? false,
      autoApproveVendors: s?.autoApproveVendors ?? false,
      passPaystackFeesToCustomers: s?.passPaystackFeesToCustomers ?? false,
      contactPhone: s?.contactPhone ?? "",
      whatsappCommunityUrl: s?.whatsappCommunityUrl ?? "",
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
    const update: Record<string, boolean | string> = {};
    if (typeof body.autoSendVendors === "boolean") update.autoSendVendors = body.autoSendVendors;
    if (typeof body.autoSendGuests === "boolean") update.autoSendGuests = body.autoSendGuests;
    if (typeof body.autoApproveVendors === "boolean") update.autoApproveVendors = body.autoApproveVendors;
    if (typeof body.passPaystackFeesToCustomers === "boolean") {
      update.passPaystackFeesToCustomers = body.passPaystackFeesToCustomers;
    }
    if (typeof body.contactPhone === "string") update.contactPhone = body.contactPhone.trim();
    if (typeof body.whatsappCommunityUrl === "string") update.whatsappCommunityUrl = body.whatsappCommunityUrl.trim();

    if (!Object.keys(update).length) {
      return Response.json({ message: "Nothing to update" }, { status: 400 });
    }

    await connectMongo();

    const settings = await SettingsModel.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return Response.json({
      autoSendVendors: settings!.autoSendVendors,
      autoSendGuests: settings!.autoSendGuests,
      autoApproveVendors: settings!.autoApproveVendors,
      passPaystackFeesToCustomers: settings!.passPaystackFeesToCustomers ?? false,
      contactPhone: settings!.contactPhone ?? "",
      whatsappCommunityUrl: settings!.whatsappCommunityUrl ?? "",
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
