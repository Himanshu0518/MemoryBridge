import * as React from "react";
import { cn } from "@/lib/utils";

// ─── FormField ───────────────────────────────────────────────────────────────
interface FormFieldProps {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

function FormField({
  label,
  error,
  description,
  required,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium leading-none text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}

      {children}

      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {error && (
        <p
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
          aria-live="polite"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-4.75a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-1.5 0v3.5Zm.75 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Separator ───────────────────────────────────────────────────────────────
function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cn("h-px w-full shrink-0 bg-border", className)}
      {...props}
    />
  );
}

export { FormField, Separator };
