import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClubsPage from "./pages/ClubsPage";
import ClubDetailPage from "./pages/ClubDetailPage";
import BookingsPage from "./pages/BookingsPage";
import CalendarPage from "./pages/CalendarPage";
import MapPage from "./pages/MapPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function NotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-sm text-slate-500">Page not found.</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="clubs" element={<ClubsPage />} />
            <Route path="clubs/:id" element={<ClubDetailPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="map" element={<MapPage />} />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute roles={["SUPER_ADMIN"]}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
