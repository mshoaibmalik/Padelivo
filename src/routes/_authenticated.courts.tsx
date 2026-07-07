import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/courts")({
  component: () => <Navigate to="/dashboard" replace />,
});
