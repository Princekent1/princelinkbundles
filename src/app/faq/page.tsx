import type { Metadata } from "next";
import { LegalLayout } from "@/components/ui/legal-layout";

export const metadata: Metadata = {
  title: "FAQs — Prince K Ventures",
};

export default function FaqPage() {
  return (
    <LegalLayout title="Frequently Asked Questions">
      <h2>Ordering & Delivery</h2>

      <h3>How long does it take to receive my data bundle?</h3>
      <p>
        Most bundles are delivered within seconds. In rare cases it may take up to 30 minutes during
        peak periods. If you haven&apos;t received your bundle after 2 hours, contact us with your
        order reference and we will investigate immediately.
      </p>

      <h3>Which networks do you support?</h3>
      <p>
        We currently support <strong>MTN</strong>, <strong>Telecel</strong>, and{" "}
        <strong>AirtelTigo</strong> Ghana.
      </p>

      <h3>Can I send a bundle to someone else&apos;s number?</h3>
      <p>
        Yes — just enter the recipient&apos;s number at checkout. Double-check the number before
        submitting. Bundles sent to the wrong number cannot be reversed or transferred.
      </p>

      <h3>How do I track my order?</h3>
      <p>
        After checkout you&apos;ll get an 8-character order reference. Visit the{" "}
        <a href="/order-status">order status page</a> and enter your reference to check its current
        status at any time.
      </p>

      <h3>What happens if my bundle doesn&apos;t arrive?</h3>
      <p>
        Contact us at <a href="mailto:support@princekventures.com">support@princekventures.com</a> with
        your order reference. If the bundle was not delivered, we will either retry the delivery or
        issue a full refund — your choice.
      </p>

      <h3>Do I need an account to buy a bundle?</h3>
      <p>
        No. You can buy as a guest — just enter the recipient&apos;s number and pay via Paystack. No
        registration required. If you buy frequently, consider applying for a vendor account to get
        wallet-based ordering and faster checkout.
      </p>

      <hr />

      <h2>Payment</h2>

      <h3>What payment methods do you accept?</h3>
      <p>
        We accept all methods supported by Paystack, including MTN Mobile Money, Telecel Cash,
        AirtelTigo Money, Visa, Mastercard, and other major debit/credit cards.
      </p>

      <h3>Is my payment information secure?</h3>
      <p>
        Yes. All payments are processed by Paystack, a PCI-DSS compliant payment provider.
        Prince K Ventures never stores your card number, CVV, or mobile money PIN.
      </p>

      <h3>I was charged but my order shows as pending. What should I do?</h3>
      <p>
        Payment confirmation can take a few minutes. Wait up to 5 minutes and refresh your order
        status page. If the order is still pending after that, contact us — do{" "}
        <strong>not</strong> attempt to pay again before reaching out, as you may be charged twice.
      </p>

      <h3>Can I get a receipt for my order?</h3>
      <p>
        Enter your email at checkout and we&apos;ll send a confirmation automatically. If you missed
        it, contact us with your order reference and we&apos;ll resend it.
      </p>

      <hr />

      <h2>Vendor Accounts</h2>

      <h3>How do I become a vendor?</h3>
      <p>
        <a href="/signup">Sign up</a> and complete the vendor application. Our team reviews
        applications within 1 business day. Once approved, you get access to wallet-based ordering
        and faster checkout without going through Paystack each time.
      </p>

      <h3>How does the vendor wallet work?</h3>
      <p>
        Top up your Prince K Ventures wallet using Mobile Money or card via Paystack. Once funded,
        place orders instantly and your wallet is debited automatically. No payment checkout needed
        per order.
      </p>

      <h3>What is the minimum wallet top-up amount?</h3>
      <p>The minimum top-up is GHS 1.00.</p>

      <h3>Can I withdraw my wallet balance?</h3>
      <p>
        Wallet balances cannot be withdrawn to a bank account or mobile money. They can only be used
        to purchase data bundles on the platform. Refunds for failed orders are credited back to your
        wallet.
      </p>

      <hr />

      <h2>Still have a question?</h2>
      <p>
        Email us at{" "}
        <a href="mailto:support@princekventures.com">support@princekventures.com</a> and we&apos;ll get
        back to you within 1 business day. We&apos;re based in Accra, Ghana.
      </p>
    </LegalLayout>
  );
}
