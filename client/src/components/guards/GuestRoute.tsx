import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectIsLoggedIn } from "@/store/selectors";

/**
 * GuestRoute — wraps routes that should only be visible to unauthenticated users.
 *
 * If the user is already logged in they are sent to /patients.
 */
export default function GuestRoute() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);

  if (isLoggedIn) {
    return <Navigate to="/patients" replace />;
  }

  return <Outlet />;
}
