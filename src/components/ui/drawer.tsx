"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { cn } from "@/lib/utils"

const Drawer = DrawerPrimitive.Root
const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-[var(--color-bg-overlay)]", className)}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "flex flex-col",
          "bg-card rounded-t-3xl shadow-[var(--shadow-5)]",
          "outline-none",
          "max-h-[90dvh]",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-pill bg-border" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 px-6 py-4", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("flex flex-col gap-2 px-6 py-4 mt-auto", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn("text-h5 font-bold text-foreground leading-[1.4]", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerOverlay,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
