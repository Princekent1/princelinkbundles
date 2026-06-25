import type { Metadata } from "next";
import { LegalLayout } from "@/components/ui/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — Prince K Ventures",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        Prince K Ventures (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is
        committed to protecting your personal information. This Privacy Policy explains what data we
        collect, how we use it, and your rights under the Ghana Data Protection Act, 2012 (Act 843).
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>Phone number of the data bundle recipient</li>
        <li>Email address (optional — only if you request a receipt)</li>
        <li>Business name, email, and phone number (for vendor account registration)</li>
        <li>Payment details — processed entirely by Paystack; we never see or store card numbers or mobile money PINs</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>Order history and transaction records</li>
        <li>IP address and browser/device type (for security and fraud prevention)</li>
        <li>Session cookies required for authentication</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To process, fulfil, and track your data bundle orders</li>
        <li>To send order confirmations and receipts where an email was provided</li>
        <li>To manage vendor accounts and wallet balances</li>
        <li>To detect and prevent fraud or abuse of our platform</li>
        <li>To comply with legal and regulatory obligations in Ghana</li>
      </ul>
      <p>
        We do not sell, rent, or share your personal information with third parties for marketing
        purposes.
      </p>

      <h2>3. Data Sharing</h2>
      <p>We share your data only with the following parties, and only to the extent necessary:</p>
      <ul>
        <li>
          <strong>Paystack</strong> — our payment processor, to complete transactions securely
        </li>
        <li>
          <strong>Jaybart / mobile network fulfilment API</strong> — only the recipient phone number
          and bundle details are passed to our fulfilment provider to deliver the bundle
        </li>
        <li>
          <strong>Mobile network operators (MTN, Telecel, AirtelTigo)</strong> — indirectly, via the
          fulfilment API, to activate the bundle on the recipient&apos;s line
        </li>
        <li>
          <strong>Legal authorities</strong> — where required by Ghanaian law or a valid court order
        </li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        We retain transaction records for a minimum of 5 years as required by Ghanaian financial
        regulations. Vendor account data is kept for as long as the account is active. You may
        request deletion of your account and associated data by contacting us — subject to any
        mandatory legal retention obligations.
      </p>

      <h2>5. Cookies</h2>
      <p>
        We use HTTP-only session cookies to authenticate logged-in vendor and admin accounts. We do
        not use tracking, analytics, or advertising cookies. You can disable cookies in your browser,
        but this will prevent you from logging in to a vendor or admin account.
      </p>

      <h2>6. Security</h2>
      <p>
        All data is transmitted over HTTPS. Passwords are hashed using industry-standard algorithms
        and never stored in plain text. Payment data is handled entirely by Paystack and is never
        stored on our servers. JWTs are stored in secure HTTP-only cookies.
      </p>

      <h2>7. Your Rights</h2>
      <p>Under the Ghana Data Protection Act, 2012, you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate or incomplete data</li>
        <li>Request deletion of your data (subject to legal retention requirements)</li>
        <li>Object to or restrict processing of your data</li>
      </ul>
      <p>
        To exercise any of these rights, email us at{" "}
        <a href="mailto:support@princekventures.com">support@princekventures.com</a>.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The latest version will always be
        available on this page. Continued use of our service after a change constitutes acceptance of
        the updated policy.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy-related enquiries, contact us at{" "}
        <a href="mailto:support@princekventures.com">support@princekventures.com</a>. We are based in
        Accra, Ghana.
      </p>
    </LegalLayout>
  );
}
