import Image from "next/image";
import Link from "next/link";

interface WordmarkProps {
  small?: boolean;
}

export function Wordmark({ small }: WordmarkProps) {
  const h = small ? 28 : 34;

  return (
    <Link
      href="/"
      aria-label="Prince K Ventures home"
      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
    >
      <Image
        src="/logo-lockup.png"
        alt="Prince K Ventures"
        height={h}
        width={h * 4.2}
        priority
        style={{ objectFit: "contain", objectPosition: "left center" }}
      />
    </Link>
  );
}
