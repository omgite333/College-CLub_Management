import type {
  AdminUserRow,
  Booking,
  Classroom,
  ClassroomDetail,
  ClubDetail,
  ClubSummary,
  Role,
  User,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; data: unknown }>();
const pendingGets = new Map<string, Promise<unknown>>();

export function clearApiCache(): void {
  getCache.clear();
}

export function getToken(): string | null {
  return localStorage.getItem("ccm_token");
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = `${BASE}${path}`;
  const cacheKey = `${opts.token ?? "anonymous"}:${url}`;

  if (method === "GET") {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;
    if (cached) getCache.delete(cacheKey);

    const pending = pendingGets.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Request failed (${res.status})`;
      throw new Error(msg);
    }

    if (method === "GET") {
      getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
    } else {
      clearApiCache();
    }
    return data;
  })();

  if (method !== "GET") return (await request) as T;

  pendingGets.set(cacheKey, request);
  try {
    return (await request) as T;
  } finally {
    if (pendingGets.get(cacheKey) === request) pendingGets.delete(cacheKey);
  }
}

function authed<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...opts, token: getToken() });
}

// --- Auth ---
export function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } });
}
export function register(name: string, email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/auth/register", { method: "POST", body: { name, email, password } });
}
export function getMe() {
  return authed<{ user: User }>("/auth/me");
}

// --- Users (SUPER_ADMIN) ---
export async function listUsers(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const { users } = await authed<{ users: AdminUserRow[] }>(`/users${q}`);
  return users;
}
export function setUserRole(id: string, payload: { role: "STUDENT" | "CLUB_ADMIN"; clubId?: string }) {
  return authed<{ user: User }>(`/users/${id}/role`, { method: "PATCH", body: payload });
}

// --- Clubs ---
export async function listClubs() {
  const { clubs } = await authed<{ clubs: ClubSummary[] }>("/clubs");
  return clubs;
}
export function createClub(payload: { name: string; description?: string; logoUrl?: string }) {
  return authed<{ club: ClubSummary }>("/clubs", { method: "POST", body: payload });
}
export function getClub(id: string) {
  return authed<ClubDetail>(`/clubs/${id}`);
}
export function updateClub(id: string, payload: { name?: string; description?: string; logoUrl?: string }) {
  return authed<{ club: ClubSummary }>(`/clubs/${id}`, { method: "PATCH", body: payload });
}
export function addMember(clubId: string, payload: { email?: string; userId?: string; role: Role }) {
  return authed<{ membership: unknown }>(`/clubs/${clubId}/members`, { method: "POST", body: payload });
}
export function removeMember(clubId: string, membershipId: string) {
  return authed<{ ok: boolean }>(`/clubs/${clubId}/members/${membershipId}`, { method: "DELETE" });
}

// --- Classrooms ---
export async function listClassrooms() {
  const { classrooms } = await authed<{ classrooms: Classroom[] }>("/classrooms");
  return classrooms;
}
export function getClassroom(id: string) {
  return authed<ClassroomDetail>(`/classrooms/${id}`);
}

// --- Bookings ---
export interface BookingQuery {
  clubId?: string;
  classroomId?: string;
  from?: string;
  to?: string;
  upcoming?: boolean;
  includeCancelled?: boolean;
}
export async function listBookings(q: BookingQuery = {}) {
  const params = new URLSearchParams();
  if (q.clubId) params.set("clubId", q.clubId);
  if (q.classroomId) params.set("classroomId", q.classroomId);
  if (q.from) params.set("from", q.from);
  if (q.to) params.set("to", q.to);
  if (q.upcoming !== undefined) params.set("upcoming", String(q.upcoming));
  if (q.includeCancelled) params.set("includeCancelled", "true");
  const qs = params.toString();
  const { bookings } = await authed<{ bookings: Booking[] }>(`/bookings${qs ? `?${qs}` : ""}`);
  return bookings;
}
export function createBooking(payload: {
  clubId: string;
  classroomId: string;
  title: string;
  purpose?: string;
  startTime: string;
  endTime: string;
}) {
  return authed<Booking>("/bookings", { method: "POST", body: payload });
}
export function updateBooking(id: string, payload: { title?: string; purpose?: string; startTime?: string; endTime?: string; classroomId?: string }) {
  return authed<Booking>(`/bookings/${id}`, { method: "PATCH", body: payload });
}
export function cancelBooking(id: string) {
  return authed<Booking>(`/bookings/${id}`, { method: "DELETE" });
}
