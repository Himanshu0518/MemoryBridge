import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";

import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, Separator } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

import { useLoginMutation, useGetMeQuery } from "@/services";
import { useAppSelector } from "@/store";
import { selectIsLoggedIn } from "@/store/selectors";

// ─── Extract server error message from RTK Query error ────────────────────────
function extractErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data !== null &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    return String((error.data as Record<string, unknown>).message);
  }
  return "Something went wrong. Please try again.";
}

// ─── Google Icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate    = useNavigate();
  const isLoggedIn  = useAppSelector(selectIsLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);

  // Redirect if already authenticated
  if (isLoggedIn) { navigate("/dashboard", { replace: true }); }

  const [login, { isLoading }] = useLoginMutation();

  // Skip the getMe call until we're logged in — it auto-fires after login
  // invalidates the "User" tag and the AuthLayout / dashboard requests it.
  useGetMeQuery(undefined, { skip: !isLoggedIn });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login({ email: values.email, password: values.password }).unwrap();
      // listenerMiddleware in store.ts handles authSlice sync automatically
      navigate("/dashboard");
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your MemoryBridge account
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email address" error={errors.email?.message} htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            leftIcon={<Mail />}
            {...register("email")}
          />
        </FormField>

        <FormField label="Password" error={errors.password?.message} htmlFor="password" required>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            leftIcon={<Lock />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
            {...register("password")}
          />
        </FormField>

        <div className="flex items-center justify-between">
          <Checkbox id="rememberMe" label="Remember me" {...register("rememberMe")} />
          <Link
            to="/auth/forgot-password"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className={cn("w-full", isLoading && "cursor-not-allowed")}
        >
          {isLoading ? (
            <><Loader2 className="animate-spin" /> Signing in…</>
          ) : "Sign in"}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator />
        <span className="shrink-0 text-xs text-muted-foreground">or</span>
        <Separator />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        onClick={() => { /* TODO: Google OAuth */ }}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/auth/register" className="font-medium underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
