import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectIsLoggedIn } from "@/store/selectors";

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Usage in routes.tsx:
 *   { element: <ProtectedRoute />, children: [...protected routes] }
 *
 * If the user is not logged in they are redirected to /auth/login
 * with the original destination stored in location.state so the login
 * page can redirect back after a successful sign-in.
 */
export default function ProtectedRoute() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const location   = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
