import { useEffect } from "react";
import type { ReactNode } from "react";
import type { Role } from "../types";

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-mist/40 border-t-accent" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium text-bodytext">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  STUDENT: "bg-slate-100 text-bodytext",
  CLUB_ADMIN: "bg-accent/10 text-accent",
  SUPER_ADMIN: "bg-plum/10 text-plum",
  CONFIRMED: "bg-accent/10 text-accent",
  CANCELLED: "bg-slate-100 text-muted",
  FREE: "bg-emerald-100 text-emerald-700",
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  BOOKED: "bg-amber-100 text-amber-700",
  OCCUPIED: "bg-red-100 text-red-700",
};

export function Badge({ text }: { text: string }) {
  const color = badgeColors[text] ?? "bg-slate-100 text-bodytext";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {text.replace(/_/g, " ")}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge text={role} />;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[20px] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-slate-100 hover:text-bodytext">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-bodytext">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6d77] disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-bodytext hover:bg-slate-50 disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Alert({ kind, message }: { kind: "error" | "success"; message: string }) {
  const styles =
    kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{message}</div>;
}

// --- Club colors (stable per club id, used by map + calendar) ---
const CLUB_PALETTE = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#65a30d",
];
export function clubHex(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLUB_PALETTE[h % CLUB_PALETTE.length];
}