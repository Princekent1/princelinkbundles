import { calculatePaystackFee } from "@/lib/paystack-fees";
import { quoteFees } from "@/lib/floatvault";
import type { Settings } from "@/lib/models/settings";

export type PaymentQuote = {
  provider: "paystack" | "floatvault";
  baseAmountGhs: number;
  processingFeeGhs: number;
  totalPayableGhs: number;
  feePayer: "customer" | "app_owner";
  feeRateBps: number;
};

type QuoteSettings = Pick<Settings, "paymentMode" | "passPaystackFeesToCustomers">;

// every provider answers the same question: what does the customer pay for this base amount?
export async function quotePayment(baseAmountGhs: number, settings: QuoteSettings): Promise<PaymentQuote> {
  if (settings.paymentMode === "floatvault") {
    const quote = await quoteFees(baseAmountGhs);
    const processingFeeGhs = quote.customerPays - baseAmountGhs;
    return {
      provider: "floatvault",
      baseAmountGhs,
      processingFeeGhs,
      totalPayableGhs: quote.customerPays,
      feePayer: quote.feePayer,
      feeRateBps: Math.round((quote.fees.total / baseAmountGhs) * 10_000),
    };
  }

  const fee = calculatePaystackFee(baseAmountGhs, settings.passPaystackFeesToCustomers);
  return {
    provider: "paystack",
    baseAmountGhs,
    processingFeeGhs: fee.processingFeeGhs,
    totalPayableGhs: fee.totalPayableGhs,
    feePayer: fee.processingFeeGhs > 0 ? "customer" : "app_owner",
    feeRateBps: fee.processingFeeRateBps,
  };
}
