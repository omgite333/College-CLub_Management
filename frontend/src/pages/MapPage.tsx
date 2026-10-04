import { useCallback, useEffect, useMemo, useState } from "react";
import { listBookings, listClassrooms } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { Booking, Classroom } from "../types";
import { Alert, Badge, EmptyState, Spinner, btnSecondary, clubHex, formatDate, formatTime, inputClass } from "../components/ui";

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Building layout traced from the college sketch (courtyard block).
// Coordinates are in SVG viewBox units (0 0 100 78).
interface MapRoom {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
}

const MAP_ROOMS: MapRoom[] = [
  // left wing
  { name: "C-101", x: 9, y: 7, w: 16, h: 9, lines: ["C-101"] },
  { name: "C-102", x: 9, y: 17, w: 16, h: 9, lines: ["C-102"] },
  { name: "C-103", x: 9, y: 27, w: 16, h: 9, lines: ["C-103"] },
  { name: "C-104", x: 9, y: 44, w: 16, h: 9, lines: ["C-104"] },
  { name: "C-105", x: 9, y: 54, w: 16, h: 9, lines: ["C-105"] },
  { name: "C-106", x: 9, y: 64, w: 16, h: 9, lines: ["C-106"] },
  // right wing
  { name: "C-201", x: 75, y: 7, w: 16, h: 9, lines: ["C-201"] },
  { name: "C-202", x: 75, y: 17, w: 16, h: 9, lines: ["C-202"] },
  { name: "C-203", x: 75, y: 27, w: 16, h: 9, lines: ["C-203"] },
  { name: "C-204", x: 75, y: 44, w: 16, h: 9, lines: ["C-204"] },
  { name: "C-205", x: 75, y: 54, w: 16, h: 9, lines: ["C-205"] },
  { name: "C-206", x: 75, y: 64, w: 16, h: 9, lines: ["C-206"] },
  // top wing
  { name: "C-301", x: 31, y: 7, w: 10, h: 9, lines: ["C-301"] },
  { name: "Sathe Hall", x: 42.5, y: 7, w: 15, h: 9, lines: ["Sathe", "Hall"] },
  { name: "C-302", x: 59, y: 7, w: 10, h: 9, lines: ["C-302"] },
  // center
  { name: "Tilak Hall", x: 40, y: 24, w: 20, h: 13, lines: ["Tilak Hall"] },
  // bottom wing
  { name: "C-303", x: 31, y: 62, w: 10, h: 9, lines: ["C-303"] },
  { name: "Open Theater", x: 42.5, y: 62, w: 15, h: 9, lines: ["Open", "Theater"] },
  { name: "C-304", x: 59, y: 62, w: 10, h: 9, lines: ["C-304"] },
];

const FREE_FILL = "#dcfce7";
const FREE_STROKE = "#16a34a";
const OCCUPIED_FILL = "#fee2e2";
const OCCUPIED_STROKE = "#dc2626";
const ACCENT = "#12808C";

function BookingRow({ booking }: { booking: Booking }) {
  const { user } = useAuth();
  const color = clubHex(booking.club.id);
  const isStudent = user?.role === "STUDENT";
  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">
          {formatDate(booking.startTime)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-bodytext shadow-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
          {booking.club.name}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-ink">{booking.title}</p>
      {booking.purpose && <p className="text-sm text-muted">{booking.purpose}</p>}
      {!isStudent && <p className="mt-1 text-xs text-muted">Booked by {booking.bookedBy.name}</p>}
    </li>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const [rooms, setRooms] = useState<Classroom[] | null>(null);
  const [dateKey, setDateKey] = useState(() => toKey(new Date()));
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [roomBookings, setRoomBookings] = useState<Booking[] | null>(null);
  const [roomBookingsError, setRoomBookingsError] = useState<string | null>(null);

  const isToday = dateKey === toKey(new Date());

  const loadDay = useCallback((key: string) => {
    const dayStart = fromKey(key);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = fromKey(key);
    dayEnd.setHours(23, 59, 59, 999);
    return listBookings({ from: dayStart.toISOString(), to: dayEnd.toISOString(), upcoming: false })
      .then(setDayBookings)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    listClassrooms()
      .then(setRooms)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setDayBookings([]);
    loadDay(dateKey);
    const timer = setInterval(() => loadDay(dateKey), 60_000);
    return () => clearInterval(timer);
  }, [dateKey, loadDay]);

  // fetch ALL bookings whenever a room is selected
  useEffect(() => {
    if (!selectedName || !rooms) {
      setRoomBookings(null);
      return;
    }
    const room = rooms.find((r) => r.name === selectedName);
    if (!room) {
      setRoomBookings([]);
      return;
    }
    setRoomBookings(null);
    setRoomBookingsError(null);
    listBookings({ classroomId: room.id, upcoming: false })
      .then((b) => setRoomBookings(b.filter((x) => x.status === "CONFIRMED")))
      .catch((e: Error) => setRoomBookingsError(e.message));
  }, [selectedName, rooms]);

  // rooms with any booking on the selected date
  const bookedNames = useMemo(() => new Set(dayBookings.map((b) => b.classroom.name)), [dayBookings]);

  // rooms in use at this very moment (only meaningful for today)
  const liveByName = useMemo(() => {
    const map = new Map<string, Booking>();
    if (!isToday) return map;
    const now = new Date();
    for (const b of dayBookings) {
      if (new Date(b.startTime) <= now && new Date(b.endTime) >= now) {
        map.set(b.classroom.name, b);
      }
    }
    return map;
  }, [dayBookings, isToday]);

  const selectedRoom = useMemo(
    () => rooms?.find((r) => r.name === selectedName) ?? null,
    [rooms, selectedName]
  );

  const selectedDayBookings = useMemo(
    () => dayBookings.filter((b) => b.classroom.name === selectedName),
    [dayBookings, selectedName]
  );

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    const upcoming = (roomBookings ?? [])
      .filter((b) => new Date(b.endTime) >= now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
    const past = (roomBookings ?? [])
      .filter((b) => new Date(b.endTime) < now)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [roomBookings]);

  const currentBooking = selectedName ? liveByName.get(selectedName) ?? null : null;
  const selectedBooked = selectedName ? bookedNames.has(selectedName) : false;

  const shiftDay = (delta: number) => {
    const d = fromKey(dateKey);
    d.setDate(d.getDate() + delta);
    setDateKey(toKey(d));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Campus Map</h1>
          <p className="text-sm text-muted">
            Pick a date to check which rooms are free or booked. Click any room for its full schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button onClick={() => shiftDay(-1)} className={btnSecondary} aria-label="Previous day">
            ←
          </button>
          <div className="w-40">
            <input
              type="date"
              aria-label="Select date"
              className={inputClass}
              value={dateKey}
              onChange={(e) => {
                if (e.target.value) setDateKey(e.target.value);
              }}
            />
          </div>
          <button onClick={() => shiftDay(1)} className={btnSecondary} aria-label="Next day">
            →
          </button>
          <button onClick={() => setDateKey(toKey(new Date()))} className={btnSecondary}>
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-bodytext">
        <span className="font-semibold text-ink">{isToday ? "Today" : formatDate(fromKey(dateKey).toISOString())}</span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ background: FREE_FILL, borderColor: FREE_STROKE }}
          />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ background: OCCUPIED_FILL, borderColor: OCCUPIED_STROKE }}
          />
          Booked
        </span>
        {isToday && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border-2"
              style={{ background: OCCUPIED_FILL, borderColor: "#b91c1c" }}
            />
            In use now
          </span>
        )}
      </div>

      {error && <Alert kind="error" message={error} />}

      {rooms === null && !error ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* SVG map */}
          <div className="card p-4 lg:col-span-2">
            <svg viewBox="0 0 100 78" className="w-full rounded-xl bg-slate-50" role="img" aria-label="College building map">
              <defs>
                <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                  <path d="M0,0 L4,2 L0,4" fill="none" stroke="#64748b" strokeWidth="0.8" />
                </marker>
              </defs>

              {/* building shell */}
              <rect x="6" y="4" width="88" height="70" rx="2.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              {/* courtyard */}
              <rect x="31" y="20" width="38" height="36" rx="1.5" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="0.6" />
              <text x="50" y="54" textAnchor="middle" fontSize="2.6" fill="#86efac">courtyard</text>

              {/* corridors */}
              <rect x="27.5" y="6" width="3" height="32" fill="#e2e8f0" />
              <rect x="27.5" y="44" width="3" height="28" fill="#e2e8f0" />
              <rect x="69.5" y="6" width="3" height="32" fill="#e2e8f0" />
              <rect x="69.5" y="44" width="3" height="28" fill="#e2e8f0" />

              {/* main entry */}
              <line x1="0.5" y1="41" x2="5.5" y2="41" stroke="#64748b" strokeWidth="0.8" markerEnd="url(#arrow)" />
              <text x="1" y="38.6" fontSize="2.8" fill="#64748b">Main entry</text>

              {/* corridor direction arrows */}
              <line x1="29" y1="5" x2="29" y2="1.6" stroke="#94a3b8" strokeWidth="0.7" markerEnd="url(#arrow)" />
              <line x1="71" y1="1.6" x2="71" y2="5" stroke="#94a3b8" strokeWidth="0.7" markerEnd="url(#arrow)" />
              <line x1="29" y1="76.6" x2="29" y2="73.2" stroke="#94a3b8" strokeWidth="0.7" markerEnd="url(#arrow)" />
              <line x1="71" y1="76.6" x2="71" y2="73.2" stroke="#94a3b8" strokeWidth="0.7" markerEnd="url(#arrow)" />

              {/* rooms */}
              {MAP_ROOMS.map((r) => {
                const booked = bookedNames.has(r.name);
                const live = liveByName.has(r.name);
                const isSel = r.name === selectedName;
                const cx = r.x + r.w / 2;
                return (
                  <g key={r.name}>
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      rx={1.2}
                      fill={booked ? OCCUPIED_FILL : FREE_FILL}
                      stroke={isSel ? ACCENT : live ? "#b91c1c" : booked ? OCCUPIED_STROKE : FREE_STROKE}
                      strokeWidth={isSel ? 1.6 : live ? 1.4 : 0.7}
                      className="cursor-pointer"
                      onClick={() => setSelectedName(r.name)}
                    >
                      <title>
                        {r.name}
                        {booked ? " — booked" : " — available"}
                        {live ? " (in use now)" : ""}
                      </title>
                    </rect>
                    {r.lines.map((line, i) => (
                      <text
                        key={i}
                        x={cx}
                        y={r.y + r.h / 2 + (i - (r.lines.length - 1) / 2) * 3.4 + 1.1}
                        textAnchor="middle"
                        fontSize={r.lines.length > 1 || line.length > 8 ? 2.7 : 3}
                        fontWeight="600"
                        fill="#0f172a"
                        pointerEvents="none"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Side panel — all bookings for the selected room */}
          <div className="card p-5">
            {!selectedName ? (
              <EmptyState title="Select a room" hint="Click any classroom or hall on the map to see all its bookings." />
            ) : !selectedRoom ? (
              <EmptyState title={selectedName} hint="This room is not registered in the system yet." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-ink">{selectedRoom.name}</h2>
                    <p className="text-sm text-muted">
                      {selectedRoom.building} · {selectedRoom.capacity} seats
                    </p>
                  </div>
                  <Badge text={selectedBooked ? "BOOKED" : "AVAILABLE"} />
                </div>

                {currentBooking && (
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Now in use</p>
                    <p className="mt-1 text-sm font-medium text-ink">{currentBooking.title}</p>
                    <p className="text-sm text-bodytext">by {currentBooking.club.name}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      Free at {formatTime(currentBooking.endTime)}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-bold text-ink">
                    {isToday ? "Today's bookings" : `Bookings on ${formatDate(fromKey(dateKey).toISOString())}`}{" "}
                    ({selectedDayBookings.length})
                  </h3>
                  {selectedDayBookings.length === 0 ? (
                    <p className="text-sm text-muted">
                      {isToday ? "Nothing scheduled today." : "This room is free on this date."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDayBookings.map((b) => (
                        <BookingRow key={b.id} booking={b} />
                      ))}
                    </ul>
                  )}
                </div>

                {roomBookingsError && <Alert kind="error" message={roomBookingsError} />}
                {roomBookings === null && !roomBookingsError ? (
                  <Spinner />
                ) : (
                  <>
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">
                        Upcoming bookings ({upcomingBookings.length})
                      </h3>
                      {upcomingBookings.length === 0 ? (
                        <p className="text-sm text-muted">Nothing scheduled.</p>
                      ) : (
                        <ul className="space-y-2">
                          {upcomingBookings.map((b) => (
                            <BookingRow key={b.id} booking={b} />
                          ))}
                        </ul>
                      )}
                    </div>
                    {!isStudent && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">
                        Past bookings ({pastBookings.length})
                      </h3>
                      {pastBookings.length === 0 ? (
                        <p className="text-sm text-muted">No history yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {pastBookings.map((b) => (
                            <BookingRow key={b.id} booking={b} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  </>
                )}

                <button
                  onClick={() => setSelectedName(null)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All rooms list */}
      {rooms && rooms.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-base font-bold text-ink">All rooms</h2>
          <ul className="divide-y divide-slate-100">
            {MAP_ROOMS.map((r) => {
              const meta = rooms.find((x) => x.name === r.name);
              return (
                <li key={r.name}>
                  <button
                    onClick={() => setSelectedName(r.name)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                  >
                    <span>
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                      <span className="ml-2 text-xs text-muted">
                        {meta ? `${meta.capacity} seats` : "not registered"}
                      </span>
                    </span>
                    <Badge text={bookedNames.has(r.name) ? "BOOKED" : "AVAILABLE"} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}