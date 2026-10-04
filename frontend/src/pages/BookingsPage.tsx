import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { cancelBooking, createBooking, listBookings, listClassrooms, listClubs, updateBooking } from "../lib/api";
import type { Booking, Classroom, ClubSummary } from "../types";
import { Alert, Badge, EmptyState, Field, Modal, Spinner, btnDanger, btnPrimary, btnSecondary, formatDateTime, inputClass } from "../components/ui";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Local calendar day, so the date filter matches what the user picked on screen.
// (toISOString() would give the UTC day, which is off by one for +05:30.)
function localDayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface BookingFormState {
  clubId: string;
  classroomId: string;
  title: string;
  purpose: string;
  start: string;
  end: string;
}

const EMPTY_FORM: BookingFormState = { clubId: "", classroomId: "", title: "", purpose: "", start: "", end: "" };

export default function BookingsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [filterClub, setFilterClub] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);

  const [modalOpen, setModalOpen] = useState(params.get("new") === "1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const adminClubIds = useMemo(
    () => new Set(user?.memberships.filter((m) => m.role === "CLUB_ADMIN").map((m) => m.clubId) ?? []),
    [user]
  );

  const canEditBooking = (b: Booking) => isSuperAdmin || adminClubIds.has(b.club.id);
  const canCreate = isSuperAdmin || adminClubIds.size > 0;
  const creatableClubs = clubs.filter((c) => isSuperAdmin || adminClubIds.has(c.id));

  const load = () => {
    setError(null);
    listBookings({ upcoming: false, includeCancelled: false })
      .then(setBookings)
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    load();
    listClubs()
      .then(setClubs)
      .catch(() => undefined);
    listClassrooms()
      .then(setClassrooms)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = bookings ?? [];
    if (filterClub) list = list.filter((b) => b.club.id === filterClub);
    if (filterRoom) list = list.filter((b) => b.classroom.id === filterRoom);
    if (filterDate) list = list.filter((b) => localDayKey(b.startTime) === filterDate);
    if (showUpcomingOnly) list = list.filter((b) => new Date(b.endTime) >= new Date());
    return [...list].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  }, [bookings, filterClub, filterRoom, filterDate, showUpcomingOnly]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, clubId: creatableClubs[0]?.id ?? "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditingId(b.id);
    setForm({
      clubId: b.club.id,
      classroomId: b.classroom.id,
      title: b.title,
      purpose: b.purpose ?? "",
      start: toLocalInput(b.startTime),
      end: toLocalInput(b.endTime),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.clubId || !form.classroomId || !form.title || !form.start || !form.end) {
      setFormError("Please fill in all required fields.");
      return;
    }
    const startTime = new Date(form.start).toISOString();
    const endTime = new Date(form.end).toISOString();
    if (new Date(endTime) <= new Date(startTime)) {
      setFormError("End time must be after start time.");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await updateBooking(editingId, {
          classroomId: form.classroomId,
          title: form.title,
          purpose: form.purpose || undefined,
          startTime,
          endTime,
        });
        setMsg("Booking updated.");
      } else {
        await createBooking({
          clubId: form.clubId,
          classroomId: form.classroomId,
          title: form.title,
          purpose: form.purpose || undefined,
          startTime,
          endTime,
        });
        setMsg("Booking confirmed.");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save booking");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (b: Booking) => {
    if (!window.confirm(`Cancel booking "${b.title}"?`)) return;
    setError(null);
    setMsg(null);
    try {
      await cancelBooking(b.id);
      setMsg("Booking cancelled.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking");
    }
  };

  const set = (k: keyof BookingFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bookings</h1>
          <p className="text-sm text-muted">
            {canCreate ? "Create and manage room bookings." : "Browse upcoming room bookings."}
          </p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className={btnPrimary}>
            + New booking
          </button>
        )}
      </div>

      {msg && <Alert kind="success" message={msg} />}
      {error && <Alert kind="error" message={error} />}

      {/* Filters */}
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Club">
          <select className={inputClass} value={filterClub} onChange={(e) => setFilterClub(e.target.value)}>
            <option value="">All clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classroom">
          <select className={inputClass} value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
            <option value="">All rooms</option>
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.building} — {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className={inputClass} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-bodytext">
            <input
              type="checkbox"
              checked={showUpcomingOnly}
              onChange={(e) => setShowUpcomingOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-accent"
            />
            Upcoming only
          </label>
        </div>
      </div>

      {bookings === null && !error ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No bookings match" hint="Adjust the filters or create a new booking." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{b.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {b.club.name} · {b.classroom.building} — {b.classroom.name} · by {b.bookedBy.name}
                  </p>
                  {b.purpose && <p className="mt-1 text-sm text-bodytext">{b.purpose}</p>}
                  <p className="mt-1 text-xs font-semibold text-ink">
                    {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge text={b.status} />
                  {canEditBooking(b) && b.status === "CONFIRMED" && (
                    <>
                      <button onClick={() => openEdit(b)} className={btnSecondary}>
                        Edit
                      </button>
                      <button onClick={() => onCancel(b)} className={btnDanger}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? "Edit booking" : "New booking"} onClose={() => setModalOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Club">
              <select className={inputClass} value={form.clubId} onChange={set("clubId")} required disabled={!!editingId}>
                <option value="">Select club</option>
                {creatableClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Classroom">
              <select className={inputClass} value={form.classroomId} onChange={set("classroomId")} required>
                <option value="">Select room</option>
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.building} — {r.name} ({r.capacity} seats)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input className={inputClass} value={form.title} onChange={set("title")} required placeholder="e.g. Weekly practice" />
            </Field>
            <Field label="Purpose / event (optional)">
              <textarea className={inputClass} rows={2} value={form.purpose} onChange={set("purpose")} placeholder="What is this for?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input type="datetime-local" className={inputClass} value={form.start} onChange={set("start")} required />
              </Field>
              <Field label="End">
                <input type="datetime-local" className={inputClass} value={form.end} onChange={set("end")} required />
              </Field>
            </div>
            {formError && <Alert kind="error" message={formError} />}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
                Close
              </button>
              <button type="submit" disabled={busy} className={btnPrimary}>
                {editingId ? "Save changes" : "Confirm booking"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}