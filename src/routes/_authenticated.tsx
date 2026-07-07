import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ClubProvider } from "@/context/ClubContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ClubProvider>
          <Gate />
        </ClubProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

function Gate() {
  const { manager } = useAuth();
  if (typeof window !== "undefined" && !manager && !localStorage.getItem("baseline.manager")) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}