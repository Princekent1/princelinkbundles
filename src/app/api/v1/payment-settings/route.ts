import connectMongo from "@/lib/mongo";
import { getSettings } from "@/lib/models/settings";
import { PAYSTACK_FEE_RATE_BPS } from "@/lib/paystack-fees";

export const GET = async () => {
  try {
    await connectMongo();
    const settings = await getSettings();

    return Response.json({
      passPaystackFeesToCustomers: settings.passPaystackFeesToCustomers,
      paystackFeeRateBps: PAYSTACK_FEE_RATE_BPS,
    });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
