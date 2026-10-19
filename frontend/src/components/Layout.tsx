import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "./ThemeToggle";

// Thin 1.5px line icons (24x24, stroke=currentColor)
function Icon({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  clubs: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.5c2.6.6 4.5 2.7 4.5 5.5" />
    </Icon>
  ),
  bookings: (
    <Icon>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5V8z" />
      <path d="M14 6v2M14 11v2M14 16v2" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  ),
  map: (
    <Icon>
      <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  ),
  admin: (
    <Icon>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l8.5-8.5M16 3.5l4 4M13.5 6l3.5 3.5" />
    </Icon>
  ),
};

const NAV = [
  { to: "/", label: "Dashboard", icon: "dashboard", roles: ["STUDENT", "CLUB_ADMIN", "SUPER_ADMIN"] },
  { to: "/clubs", label: "Clubs", icon: "clubs", roles: ["STUDENT", "CLUB_ADMIN", "SUPER_ADMIN"] },
  { to: "/bookings", label: "Bookings", icon: "bookings", roles: ["STUDENT", "CLUB_ADMIN", "SUPER_ADMIN"] },
  { to: "/calendar", label: "Calendar", icon: "calendar", roles: ["STUDENT", "CLUB_ADMIN", "SUPER_ADMIN"] },
  { to: "/map", label: "Campus Map", icon: "map", roles: ["STUDENT", "CLUB_ADMIN", "SUPER_ADMIN"] },
  { to: "/admin/users", label: "Access Management", icon: "admin", roles: ["SUPER_ADMIN"] },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const links = NAV.filter((n) => user && (n.roles as readonly string[]).includes(user.role));

  return (
    <div className="flex h-full flex-col">
      <div className="px-2 pb-8 pt-2">
        <span className="flex items-center gap-3">
          <img
            src="/wce-logo.png"
            alt="Walchand College of Engineering"
            className="h-10 w-10 rounded-xl bg-white object-contain p-1"
          />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-white">WCE CampusGrid</span>
            <span className="block text-[11px] font-medium text-white/50">Walchand College of Engineering</span>
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-deep text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {ICONS[n.icon]}
            {n.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-white/50">{user.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-canvas font-sans text-bodytext">
      {/* Desktop floating sidebar */}
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-60 rounded-[20px] bg-abyss p-5 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile slide-over */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-abyss/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute bottom-4 left-4 top-4 w-64 rounded-[20px] bg-abyss p-5">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-8">
            <button
              className="rounded-xl bg-surface p-2.5 text-bodytext shadow-sm lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon d="M4 7h16M4 12h16M4 17h16" />
            </button>

            <p className="hidden text-base font-bold text-ink md:block">{today}</p>

            <div className="mx-auto w-full max-w-xl flex-1">
              <div className="flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 shadow-sm">
                <span className="text-muted">
                  <Icon>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </Icon>
                </span>
                <input
                  placeholder="Search clubs, rooms, bookings…"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            <ThemeToggle />

            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-bodytext shadow-sm"
            >
              <Icon>
                <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </Icon>
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#E5484D]" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-sm">
              {initial}
            </div>

            <button
              onClick={onLogout}
              aria-label="Logout"
              title="Logout"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-bodytext shadow-sm hover:text-accent"
            >
              <Icon>
                <path d="M14 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8" />
                <path d="M10 12h11M18 8l4 4-4 4" />
              </Icon>
            </button>
          </div>
        </header>

        <main className="px-4 pb-10 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}