import { createBrowserRouter, Navigate } from "react-router-dom";

// ── Layouts ───────────────────────────────────────────────────────────────────
import RootLayout  from "@/layouts/RootLayout";
import AuthLayout  from "@/layouts/AuthLayout";

// ── Guards ────────────────────────────────────────────────────────────────────
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import GuestRoute     from "@/components/guards/GuestRoute";

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage    from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

// ── Patients ──────────────────────────────────────────────────────────────────
import PatientsPage      from "@/pages/patients/PatientsPage";
import PatientDetailPage from "@/pages/patients/PatientDetailPage";

// ── Recognition ───────────────────────────────────────────────────────────────
import RecognitionHubPage from "@/pages/recognition/RecognitionHubPage";
import RecognitionPage    from "@/pages/recognition/RecognitionPage";

// ── 404 ───────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl font-bold tracking-tighter">404</span>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        href="/patients"
        className="text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
      >
        Go home
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  // ── Root (authenticated) ──────────────────────────────────────────────────
  {
    path: "/",
    Component: RootLayout,
    children: [
      // "/" → "/patients"
      { index: true, element: <Navigate to="/patients" replace /> },

      {
        element: <ProtectedRoute />,
        children: [
          // Patients
          { path: "patients",        Component: PatientsPage      },
          { path: "patients/:id",    Component: PatientDetailPage },

          // Recognition
          { path: "recognition",              Component: RecognitionHubPage },
          { path: "recognition/:patientId",   Component: RecognitionPage    },
        ],
      },

      { path: "*", Component: NotFound },
    ],
  },

  // ── Auth (guest only) ─────────────────────────────────────────────────────
  {
    path: "/auth",
    element: <GuestRoute />,
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
