import Link from "next/link";

interface WordmarkProps {
  small?: boolean;
}

export function Wordmark({ small }: WordmarkProps) {
  const size = small ? 36 : 42;

  return (
    <Link
      href="/"
      aria-label="Prince K Ventures home"
      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <span
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700,
          fontSize: small ? "1rem" : "1.125rem",
          color: "var(--ink-900)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        Prince K<span style={{ color: "var(--bh-accent-500)" }}> Ventures</span>
      </span>
    </Link>
  );
}
