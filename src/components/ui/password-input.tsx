"use client";

import { useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";

type Props = Omit<React.ComponentProps<typeof Input>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={show ? "text" : "password"}
          className={`pr-10 ${className ?? ""}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)] transition-colors"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          <Icon name={show ? "eye-off" : "eye"} size={16} />
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
