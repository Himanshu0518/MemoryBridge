import { createBrowserRouter, Navigate } from "react-router-dom";

// ── Layouts ───────────────────────────────────────────────────────────────────
import RootLayout  from "@/layouts/RootLayout";
import AuthLayout  from "@/layouts/AuthLayout";

// ── Route guards ──────────────────────────────────────────────────────────────
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import GuestRoute     from "@/components/guards/GuestRoute";

// ── Auth pages ────────────────────────────────────────────────────────────────
import LoginPage    from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

// ── App pages ─────────────────────────────────────────────────────────────────
import DashboardPage from "@/pages/DashboardPage";

// ── 404 ───────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl font-bold tracking-tighter">404</span>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        href="/"
        className="text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
      >
        Go home
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  // ── Root shell ────────────────────────────────────────────────────────────
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Protected — must be logged in
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", Component: DashboardPage },
        ],
      },

      { path: "*", Component: NotFound },
    ],
  },

  // ── Auth shell — guest only (redirect to /dashboard if already logged in) ─
  {
    path: "/auth",
    element: (
      <GuestRoute />
    ),
    children: [
      {
        Component: AuthLayout,
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          { path: "login",    Component: LoginPage    },
          { path: "register", Component: RegisterPage },
        ],
      },
    ],
  },
]);
