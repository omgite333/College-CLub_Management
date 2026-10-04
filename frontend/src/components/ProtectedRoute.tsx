import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../types";
import { Spinner } from "./ui";

export default function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-lg font-semibold text-slate-900">Not authorized</h1>
          <p className="mt-2 text-sm text-slate-500">Your role does not have access to this page.</p>
          <a href="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
