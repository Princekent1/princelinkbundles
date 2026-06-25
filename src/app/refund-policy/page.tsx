import type { Metadata } from "next";
import { LegalLayout } from "@/components/ui/legal-layout";

export const metadata: Metadata = {
  title: "Refund Policy — Prince K Ventures",
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy">
      <p>
        We want every Prince K Ventures transaction to go smoothly. This policy explains when you are
        eligible for a refund and how to request one.
      </p>

      <h2>1. Eligible Refund Scenarios</h2>
      <p>You are entitled to a full refund if:</p>
      <ul>
        <li>Your payment was successfully charged but no bundle was delivered within 2 hours</li>
        <li>
          You were charged for a bundle that is no longer available and an alternative was not
          offered
        </li>
        <li>A technical error resulted in a duplicate charge for the same order</li>
        <li>
          Prince K Ventures is unable to fulfil your order for any reason on our end
        </li>
      </ul>

      <h2>2. Non-Refundable Scenarios</h2>
      <p>Refunds will <strong>not</strong> be issued if:</p>
      <ul>
        <li>
          The bundle was successfully delivered to the phone number provided — please double-check
          the recipient number before placing your order
        </li>
        <li>
          You entered the wrong phone number — bundles sent to an incorrect number cannot be
          reversed or transferred
        </li>
        <li>
          The bundle was consumed or has expired — bundle usage and validity are managed by the
          mobile network operator
        </li>
        <li>
          You change your mind after a successful delivery
        </li>
        <li>
          The request is made more than 7 days after the original transaction date
        </li>
      </ul>

      <h2>3. Vendor Wallet Refunds</h2>
      <p>
        For orders placed by vendor accounts using wallet balance, refunds are credited back to the
        vendor&apos;s Prince K Ventures wallet — not returned to the original payment method. Wallet refunds
        are only issued when an order has been marked as failed by our team.
      </p>
      <p>
        Wallet top-up amounts are non-refundable to the original payment method once credited to
        your wallet, except in cases of a platform error.
      </p>

      <h2>4. How to Request a Refund</h2>
      <p>To request a refund, contact us with the following information:</p>
      <ul>
        <li>Your order reference number</li>
        <li>The phone number used at checkout</li>
        <li>A brief description of the issue</li>
      </ul>
      <p>
        Email us at <a href="mailto:support@princekventures.com">support@princekventures.com</a>. We aim to respond
        within 1 business day.
      </p>

      <h2>5. Processing Time</h2>
      <p>
        Approved refunds for Paystack payments are processed within 3–7 business days, depending on
        your bank or mobile money provider. Wallet refunds are credited instantly once approved by
        our team.
      </p>

      <h2>6. Contact</h2>
      <p>
        For any refund enquiries, contact us at{" "}
        <a href="mailto:support@princekventures.com">support@princekventures.com</a>.
      </p>
    </LegalLayout>
  );
}
