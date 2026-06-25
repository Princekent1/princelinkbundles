import type { Metadata } from "next";
import { LegalLayout } from "@/components/ui/legal-layout";

export const metadata: Metadata = {
  title: "Terms & Conditions — Prince K Ventures",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions">
      <p>
        By accessing or using Prince K Ventures (&quot;the Service&quot;), you agree to
        be bound by these Terms and Conditions. Please read them carefully before placing an order.
      </p>

      <h2>1. About Prince K Ventures</h2>
      <p>
        Prince K Ventures is an online platform based in Accra, Ghana, that facilitates
        the purchase of mobile data bundles for MTN, Telecel, and AirtelTigo subscribers in Ghana.
        We act as a reseller of data services and are not affiliated with, endorsed by, or an agent
        of any mobile network operator.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use this Service. By placing an order, you confirm that
        the phone number provided is a valid Ghanaian mobile number and that you have authorisation
        to direct services to that number.
      </p>

      <h2>3. Orders and Payment</h2>
      <p>
        All prices are displayed in Ghanaian Cedis (GHS) and include any applicable fees. Payment is
        processed securely via Paystack. An order is only confirmed once payment has been
        successfully received and verified by Paystack.
      </p>
      <p>
        Prince K Ventures reserves the right to cancel any order that cannot be fulfilled and will
        issue a full refund in such cases.
      </p>

      <h2>4. Bundle Delivery</h2>
      <p>
        Data bundles are delivered to the recipient&apos;s mobile number via our fulfilment provider.
        Delivery is typically instant but may take up to 30 minutes during high-traffic periods. We
        are not responsible for delays caused by the mobile network operator or fulfilment API.
      </p>
      <p>
        <strong>Double-check the recipient&apos;s phone number before submitting your order.</strong>{" "}
        Bundles sent to an incorrect number cannot be reversed or transferred.
      </p>

      <h2>5. Bundle Validity and Usage</h2>
      <p>
        Data bundle validity periods and terms are set by the respective mobile network operator and
        are displayed on our platform at the time of purchase. Prince K Ventures has no control over
        how or when a network operator modifies bundle terms, expiry periods, or availability.
      </p>

      <h2>6. Vendor Accounts</h2>
      <p>
        Vendors who apply for a reseller account must provide accurate business information during
        registration. Prince K Ventures reserves the right to approve, suspend, or permanently disable
        any vendor account at its sole discretion, with or without notice.
      </p>
      <p>
        Vendor wallet balances are non-transferable and non-refundable except in cases of platform
        error or service discontinuation.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the platform for any unlawful purpose under Ghanaian law</li>
        <li>Resell bundles in a manner that violates network operator terms of service</li>
        <li>Attempt to exploit, hack, or disrupt the platform or its infrastructure</li>
        <li>Provide false or misleading information during checkout or account registration</li>
        <li>Use automated tools to place orders without prior written consent</li>
      </ul>

      <h2>8. Limitation of Liability</h2>
      <p>
        Prince K Ventures shall not be liable for any indirect, incidental, or
        consequential damages arising from the use or inability to use the Service, including delays
        or failures caused by mobile network operators, payment processors, or our fulfilment API
        provider.
      </p>
      <p>
        Our total liability for any claim arising from these Terms shall not exceed the amount paid
        for the specific transaction giving rise to the claim.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We reserve the right to update these Terms at any time. Changes will be posted on this page
        with an updated date. Continued use of the Service after any changes constitutes acceptance
        of the new Terms.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of the Republic of
        Ghana. Any disputes shall be subject to the exclusive jurisdiction of the courts of Ghana.
      </p>

      <h2>11. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:support@princekventures.com">support@princekventures.com</a>.
      </p>
    </LegalLayout>
  );
}
