"use client"

import { Toaster as Sonner } from "sonner"

function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "font-sans text-body-sm rounded-2xl shadow-(--shadow-3) border border-border-subtle bg-card text-foreground",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-(--color-danger-subtle) text-(--color-danger)",
          success: "border-(--color-success-subtle) text-(--color-success)",
        },
      }}
    />
  )
}

export { Toaster }
