import * as React from "react";
import { cn } from "@/shared/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
  size?: "default" | "sm";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary-dark",
          variant === "ghost" && "hover:bg-white/10",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-2",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
