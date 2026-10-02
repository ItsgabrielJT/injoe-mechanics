import * as React from "react";
import { cn } from "@/shared/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary-dark",
          variant === "ghost" && "hover:bg-primary/10 text-foreground",
          variant === "outline" && "border border-border bg-background hover:bg-muted",
          variant === "destructive" && "bg-destructive text-destructive-foreground hover:opacity-90",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-2",
          size === "icon" && "h-9 w-9 p-0",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
