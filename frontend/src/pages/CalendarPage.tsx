import { useEffect, useMemo, useState } from "react";
import { listBookings, listClassrooms } from "../lib/api";
import type { Booking, Classroom } from "../types";
import { Alert, EmptyState, Field, Spinner, btnSecondary, clubHex, formatTime, inputClass } from "../components/ui";

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 6x7 grid starting on Monday, covering the given month
function monthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setDate(start.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => dayKey(new Date()));
  const [roomFilter, setRoomFilter] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(viewDate), [viewDate]);

  useEffect(() => {
    listClassrooms()
      .then(setClassrooms)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const from = new Date(days[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(days[41]);
    to.setHours(23, 59, 59, 999);
    setBookings(null);
    setError(null);
    listBookings({ from: from.toISOString(), to: to.toISOString(), upcoming: false })
      .then(setBookings)
      .catch((e: Error) => {
        setError(e.message);
        setBookings([]);
      });
  }, [days]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const d of days) map.set(dayKey(d), []);
    for (const b of bookings ?? []) {
      if (roomFilter && b.classroom.id !== roomFilter) continue;
      const key = dayKey(new Date(b.startTime));
      if (map.has(key)) map.get(key)!.push(b);
    }
    for (const list of map.values())
      list.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
    return map;
  }, [bookings, days, roomFilter]);

  const selectedBookings = useMemo(
    () => bookingsByDay.get(selectedKey) ?? [],
    [bookingsByDay, selectedKey]
  );

  const shiftMonth = (delta: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  const todayKey = dayKey(new Date());
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Booking Calendar</h1>
          <p className="text-sm text-muted">Every booking, on a real calendar. Click a day for details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className={btnSecondary} aria-label="Previous month">
            ← Prev
          </button>
          <button
            onClick={() => {
              setViewDate(new Date());
              setSelectedKey(dayKey(new Date()));
            }}
            className={btnSecondary}
          >
            Today
          </button>
          <button onClick={() => shiftMonth(1)} className={btnSecondary} aria-label="Next month">
            Next →
          </button>
        </div>
      </div>

      <div className="max-w-xs">
        <Field label="Classroom">
          <select className={inputClass} value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
            <option value="">All rooms</option>
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <Alert kind="error" message={error} />}

      {bookings === null && !error ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Month grid */}
          <div className="card p-4 xl:col-span-2">
            <h2 className="mb-3 text-center text-lg font-bold text-ink">{monthLabel}</h2>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const key = dayKey(d);
                const list = bookingsByDay.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const inMonth = d.getMonth() === viewDate.getMonth();
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`min-h-20 rounded-xl border p-1.5 text-left align-top transition-colors sm:min-h-24 ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/25"
                        : "border-slate-100 hover:border-accent/40 hover:bg-accent/5"
                    } ${inMonth ? "bg-white" : "bg-slate-50/60"}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? "bg-accent text-white" : inMonth ? "text-ink" : "text-muted"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {list.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className="truncate rounded-md px-1 py-0.5 text-[11px] font-medium text-white"
                          style={{ background: clubHex(b.club.id) }}
                          title={`${formatTime(b.startTime)} · ${b.classroom.name} · ${b.club.name}: ${b.title}`}
                        >
                          {formatTime(b.startTime)} {b.classroom.name}
                        </div>
                      ))}
                      {list.length > 3 && (
                        <div className="px-1 text-[11px] font-medium text-muted">+{list.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="font-semibold">Clubs:</span>
              {Array.from(new Map((bookings ?? []).map((b) => [b.club.id, b.club.name])).entries()).map(
                ([id, name]) => (
                  <span key={id} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: clubHex(id) }} />
                    {name}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Day detail */}
          <div className="card p-5">
            <h2 className="text-base font-bold text-ink">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="mb-3 text-sm text-muted">
              {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"}
            </p>
            {selectedBookings.length === 0 ? (
              <EmptyState title="No bookings" hint="Nothing scheduled for this day." />
            ) : (
              <ul className="space-y-3">
                {selectedBookings.map((b) => (
                  <li key={b.id} className="rounded-xl border-l-4 bg-slate-50 p-3" style={{ borderColor: clubHex(b.club.id) }}>
                    <p className="text-sm font-bold text-ink">
                      {formatTime(b.startTime)} – {formatTime(b.endTime)}
                    </p>
                    <p className="text-sm font-medium text-bodytext">
                      {b.classroom.name}
                      <span className="ml-2 text-xs font-normal text-muted">{b.club.name}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-bodytext">{b.title}</p>
                    {b.purpose && <p className="text-xs text-muted">{b.purpose}</p>}
                    <p className="mt-1 text-xs text-muted">Booked by {b.bookedBy.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}