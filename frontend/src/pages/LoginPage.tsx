import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Alert, Field, btnPrimary, inputClass } from "../components/ui";

const DEMO_CREDS = [
  { email: "superadmin@college.edu", password: "Super@123", role: "Super Admin" },
  { email: "clubadmin@college.edu", password: "Club@123", role: "Club Admin" },
  { email: "student@college.edu", password: "Student@123", role: "Student" },
];

const FEATURES = [
  "Clash-free classroom bookings for every club",
  "Live campus map with room availability",
  "Role-based access for students and admins",
];

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas font-sans">
      {/* Brand panel */}
      <div className="hidden w-[42%] flex-col justify-between bg-ink p-10 text-white lg:flex">
        <span className="text-2xl font-bold tracking-tight">ClubHub</span>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Every club.
            <br />
            Every room.
            <br />
            One hub.
          </h2>
          <p className="mt-4 max-w-sm text-white/60">
            Book classrooms, track events and see live availability across campus.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/40">Walchand College of Engineering</p>
      </div>

      {/* Form side */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <span className="text-2xl font-bold text-ink">ClubHub</span>
          </div>

          <div className="card p-8">
            <h1 className="text-xl font-bold text-ink">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {tab === "login" ? "Log in to manage your clubs." : "Join as a student in seconds."}
            </p>

            <div className="mb-5 mt-5 grid grid-cols-2 rounded-full bg-canvas p-1">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`rounded-full py-2 text-sm font-semibold ${
                    tab === t ? "bg-white text-ink shadow-sm" : "text-muted hover:text-bodytext"
                  }`}
                >
                  {t === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {tab === "register" && (
                <Field label="Name">
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
              )}
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              {error && <Alert kind="error" message={error} />}
              <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
                {submitting ? "Please wait…" : tab === "login" ? "Login" : "Create account"}
              </button>
            </form>
          </div>

          <div className="card mt-4 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Demo credentials</p>
            <div className="space-y-1">
              {DEMO_CREDS.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setEmail(c.email);
                    setPassword(c.password);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-canvas"
                >
                  <span className="text-bodytext">
                    <span className="font-semibold">{c.role}</span>
                    <span className="text-muted"> — {c.email}</span>
                  </span>
                  <span className="text-xs font-semibold text-accent">Fill</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}