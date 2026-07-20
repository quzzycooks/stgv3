import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { usersApi } from "@/api/users";

export function ProtectedRoute() {
  const session = useAuthStore((s) => s.session);
  const setRedirectAfterAuth = useAuthStore((s) => s.setRedirectAfterAuth);
  const location = useLocation();

  if (!session) {
    // Remember where they were headed (e.g. a shared article link) so login/
    // registration can drop them back there instead of the generic home screen.
    setRedirectAfterAuth(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  if (!session.registrationComplete) return <Navigate to="/register/identity" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const session = useAuthStore((s) => s.session);
  if (session?.registrationComplete) return <Navigate to="/home" replace />;
  return <Outlet />;
}

/**
 * Registration wizard: requires a session (post-OTP), regardless of this
 * tab's locally cached completion flag. Registration is not idempotent on
 * the server (submitting twice adds a second batch of emergency contacts
 * on top of the first), so a stale tab that still thinks you're mid-wizard
 * must be caught here — it re-checks the real account status on every
 * entry rather than trusting localStorage, which doesn't sync across tabs.
 */
export function RegistrationRoute() {
  const session = useAuthStore((s) => s.session);
  const setRegistrationComplete = useAuthStore((s) => s.setRegistrationComplete);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: usersApi.me,
    enabled: Boolean(session),
    staleTime: 0,
  });

  if (!session) return <Navigate to="/login" replace />;
  if (isLoading) return null;

  if (profile && profile.accountStatus !== "INCOMPLETE") {
    setRegistrationComplete(true);
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
