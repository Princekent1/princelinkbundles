export const PAYSTACK_FEE_RATE_BPS = 195;

export type PaystackFeeBreakdown = {
  baseAmountGhs: number;
  processingFeeGhs: number;
  totalPayableGhs: number;
  processingFeeRateBps: number;
};

export function calculatePaystackFee(
  baseAmountGhs: number,
  passFeesToCustomer: boolean,
  rateBps = PAYSTACK_FEE_RATE_BPS
): PaystackFeeBreakdown {
  if (!passFeesToCustomer || rateBps <= 0) {
    return {
      baseAmountGhs,
      processingFeeGhs: 0,
      totalPayableGhs: baseAmountGhs,
      processingFeeRateBps: rateBps,
    };
  }

  const denominatorBps = 10_000 - rateBps;
  const totalPayableGhs = Math.ceil((baseAmountGhs * 10_000) / denominatorBps);

  return {
    baseAmountGhs,
    processingFeeGhs: totalPayableGhs - baseAmountGhs,
    totalPayableGhs,
    processingFeeRateBps: rateBps,
  };
}
