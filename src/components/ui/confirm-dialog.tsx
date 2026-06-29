"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  variant?: "default" | "destructive"
  confirmDisabled?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px] gap-0 p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[15px] font-bold text-[var(--ink-900)]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[13px] text-[var(--ink-600)] leading-relaxed mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex gap-2 justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-full">Cancel</Button>
          </DialogClose>
          <Button
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={`rounded-full px-6 font-semibold ${
              variant === "destructive"
                ? "bg-[var(--err)] hover:bg-[var(--err)]/90 text-white"
                : "bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
            } disabled:bg-[var(--ink-200)] disabled:text-[var(--ink-400)]`}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
