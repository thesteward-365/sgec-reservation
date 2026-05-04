import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "text-color": [{
        text: [
          "foreground", "primary-foreground", "secondary-foreground",
          "muted-foreground", "accent-foreground", "destructive-foreground",
          "card-foreground", "popover-foreground",
          "primary", "secondary", "muted", "accent", "destructive",
        ],
      }],
      "font-size": [{
        text: ["display-md", "h1", "h2", "h3", "h4", "h5", "body-lg", "body", "body-sm", "caption", "overline"],
      }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function formatPhoneNumber(value: string) {
  const digits = normalizePhoneNumber(value)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
