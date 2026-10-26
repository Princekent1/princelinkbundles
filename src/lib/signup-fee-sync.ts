import { verifyTransaction } from "@/lib/paystack";
import { syncFloatVaultSignupFee } from "@/lib/floatvault-sync";
import { settleSignupFeePaid } from "@/lib/settlement";

export type SignupFeeSync = { status: "pending" | "success" | "failed"; providerStatus?: string };

// Asks the payment provider where a signup fee stands and settles it if it has been paid.
// Safe to call repeatedly: settlement is status-guarded.
export async function syncSignupFee(fee: { reference: string; channel?: string }): Promise<SignupFeeSync> {
  if (fee.channel === "floatvault") {
    const { status } = await syncFloatVaultSignupFee(fee.reference);
    return { status: status === "success" || status === "failed" ? status : "pending" };
  }

  const result = await verifyTransaction(fee.reference);
  if (result.status !== "success") return { status: "pending", providerStatus: result.status };

  await settleSignupFeePaid(fee.reference, { paystackReference: fee.reference, paystackAmountGhs: result.amount });
  return { status: "success" };
}
