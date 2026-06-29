import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[var(--ink-50)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-[440px] w-full text-center">
        <Wordmark small />

        <div className="size-[72px] rounded-full bg-[var(--ink-100)] grid place-items-center mx-auto mt-8 mb-6">
          <Icon name="lock" size={28} />
        </div>

        <h1 className="bh-display text-[28px] leading-[1.1] tracking-[-0.03em] mb-2.5">
          Application under review.
        </h1>
        <p className="text-[var(--ink-500)] text-[15px] leading-relaxed mb-8">
          Your vendor account has been created and is pending admin approval.
          You&apos;ll be able to log in and start placing orders once approved.
        </p>

        <Card className="p-4 gap-0 rounded-[14px] border-[var(--ink-200)] bg-[var(--ink-100)] text-[13px] text-[var(--ink-600)] leading-relaxed text-left mb-7">
          <div className="font-semibold text-[var(--ink-900)] mb-1.5">What happens next?</div>
          <ol className="m-0 pl-[18px] flex flex-col gap-1.5">
            <li>The admin reviews your application — usually within 24 hours.</li>
            <li>Once approved, your account is activated and you can log in.</li>
            <li>Top up your wallet and start placing orders immediately.</li>
          </ol>
        </Card>

        <Card className="p-3.5 gap-0 rounded-xl border border-dashed border-[var(--ink-200)] bg-[var(--ink-100)] text-[13px] text-[var(--ink-600)] mb-7">
          <span className="font-semibold text-[var(--ink-900)]">Questions?</span>{" "}
          Contact support and mention your registered email address.
        </Card>

        <Button asChild variant="outline" className="rounded-full px-6 py-3 h-auto text-sm font-semibold gap-1.5">
          <Link href="/login">
            <Icon name="arrow-left" size={14} /> Back to sign in
          </Link>
        </Button>
      </div>
    </div>
  );
}
