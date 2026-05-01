"use client"

import { Toaster as Sonner } from "sonner"

function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "font-sans text-body-sm rounded-2xl shadow-[var(--shadow-3)] border border-border-subtle bg-card text-foreground",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-[var(--color-danger-subtle)] text-[var(--color-danger)]",
          success: "border-[var(--color-success-subtle)] text-[var(--color-success)]",
        },
      }}
    />
  )
}

export { Toaster }
