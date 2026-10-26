import { type NextRequest } from "next/server";
import connectMongo from "@/lib/mongo";
import { BundleModel } from "@/lib/models/bundle";
import { getSettings } from "@/lib/models/settings";
import { quotePayment } from "@/lib/payments/quote";
import { createErrorResponse } from "@/lib/errors";
import { getIp, paymentQuoteLimiter } from "@/lib/rate-limit";

const MAX_QUOTE_GHS = 500_000;

// what the customer will be charged for a bundle (guest price) or a wallet top-up amount, under the active provider
export const GET = async (req: NextRequest) => {
  try {
    if (!paymentQuoteLimiter.check(`quote:${getIp(req)}`)) return createErrorResponse("RateLimited");

    const { searchParams } = new URL(req.url);
    const bundleId = searchParams.get("bundleId");
    const amountParam = searchParams.get("amountGhs");

    await connectMongo();

    let baseAmountGhs: number;
    if (bundleId) {
      const bundle = await BundleModel.findOne({ _id: bundleId, archivedAt: null }).lean();
      if (!bundle) return createErrorResponse("NotFound", "Bundle not found or unavailable");
      baseAmountGhs = bundle.priceGhs;
    } else if (amountParam) {
      baseAmountGhs = Number(amountParam);
      if (!Number.isInteger(baseAmountGhs) || baseAmountGhs < 100 || baseAmountGhs > MAX_QUOTE_GHS) {
        return createErrorResponse("ValidationError", "amountGhs must be an integer in pesewas between 100 and 500000");
      }
    } else {
      return createErrorResponse("ValidationError", "bundleId or amountGhs is required");
    }

    const settings = await getSettings();

    const quote = await quotePayment(baseAmountGhs, settings);
    return Response.json(quote);
  } catch {
    return Response.json({ message: "We couldn't price this right now. Please try again shortly." }, { status: 502 });
  }
};
