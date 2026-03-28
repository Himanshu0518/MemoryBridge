import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Optional leading icon */
  leftIcon?: React.ReactNode;
  /** Optional trailing icon / interactive element */
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightElement, ...props }, ref) => {
    const hasAdornment = leftIcon || rightElement;

    if (hasAdornment) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground [&_svg]:size-4">
              {leftIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            data-slot="input"
            className={cn(
              "flex h-9 w-full rounded-lg border border-input bg-background py-1 text-sm shadow-xs",
              "placeholder:text-muted-foreground transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
              leftIcon ? "pl-9 pr-3" : "px-3",
              rightElement && "pr-9",
              className
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3 flex items-center text-muted-foreground [&_svg]:size-4">
              {rightElement}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs",
          "placeholder:text-muted-foreground transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
