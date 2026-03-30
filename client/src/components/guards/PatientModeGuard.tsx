import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectIsInPatientMode } from "@/store/selectors";

/**
 * PatientModeGuard — protects /patient-mode/* routes.
 *
 * Only allows access when a patient session is active in Redux.
 * If someone navigates to /patient-mode directly without a session,
 * they are sent back to /patients.
 */
export default function PatientModeGuard() {
  const isInPatientMode = useAppSelector(selectIsInPatientMode);

  if (!isInPatientMode) {
    return <Navigate to="/patients" replace />;
  }

  return <Outlet />;
}
