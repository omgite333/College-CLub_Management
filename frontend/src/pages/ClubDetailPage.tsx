import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { addMember, getClub, listEvents, removeMember, updateClub } from "../lib/api";
import type { ClubDetail, ClubEvent } from "../types";
import { Alert, Badge, EmptyState, Field, Modal, Spinner, btnDanger, btnPrimary, btnSecondary, clubHex, formatDate, formatDateTime, inputClass } from "../components/ui";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<ClubDetail | null>(null);
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // edit form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // add member form state
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"STUDENT" | "CLUB_ADMIN">("STUDENT");
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!id) return;
    setError(null);
    getClub(id)
      .then((d) => {
        setData(d);
        setName(d.club.name);
        setDescription(d.club.description ?? "");
      })
      .catch((e: Error) => setError(e.message));
    listEvents(id)
      .then(setEvents)
      .catch(() => setEvents([]));
  };

  useEffect(load, [id]);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isClubAdmin = useMemo(
    () =>
      isSuperAdmin ||
      user?.memberships.some((m) => m.clubId === id && m.role === "CLUB_ADMIN") === true,
    [user, id, isSuperAdmin]
  );

  const onSaveClub = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await updateClub(id, { name, description });
      setMsg("Club updated.");
      setEditing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const onAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await addMember(id, { email: memberEmail, role: memberRole });
      setMsg("Member added.");
      setShowAddMember(false);
      setMemberEmail("");
      setMemberRole("STUDENT");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  };

  const onRemoveMember = async (membershipId: string, memberName: string) => {
    if (!id || !window.confirm(`Remove ${memberName} from this club?`)) return;
    setError(null);
    setMsg(null);
    try {
      await removeMember(id, membershipId);
      setMsg("Member removed.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove member");
    }
  };

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link to="/clubs" className="text-sm font-semibold text-accent">← Back to clubs</Link>
        <Alert kind="error" message={error} />
      </div>
    );
  }
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link to="/clubs" className="text-sm font-semibold text-accent hover:underline">
        ← Back to clubs
      </Link>

      {msg && <Alert kind="success" message={msg} />}
      {error && <Alert kind="error" message={error} />}

      {/* Header */}
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {data.club.logoUrl ? (
              <img src={data.club.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ background: clubHex(data.club.id) }}
              >
                {data.club.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-ink">{data.club.name}</h1>
              <p className="text-xs text-muted">
                {data.members.length} members · since {formatDate(data.club.createdAt)}
              </p>
            </div>
          </div>
          {isClubAdmin && !editing && (
            <button onClick={() => setEditing(true)} className={btnSecondary}>
              Edit club
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={onSaveClub} className="mt-5 space-y-3">
            <Field label="Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={btnPrimary}>
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          data.club.description && <p className="mt-4 text-sm text-bodytext">{data.club.description}</p>
        )}
      </section>

      {/* Members */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Members</h2>
          {isClubAdmin && (
            <button onClick={() => setShowAddMember(true)} className={btnPrimary}>
              + Add member
            </button>
          )}
        </div>
        {data.members.length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Joined</th>
                  {isClubAdmin && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.membershipId} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-ink">{m.name}</td>
                    <td className="py-2.5 pr-4 text-bodytext">{m.email}</td>
                    <td className="py-2.5 pr-4">
                      <Badge text={m.role} />
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{formatDate(m.joinedAt)}</td>
                    {isClubAdmin && (
                      <td className="py-2.5">
                        {(isSuperAdmin || m.role === "STUDENT") && (
                          <button className={btnDanger} onClick={() => onRemoveMember(m.membershipId, m.name)}>
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Representatives */}
      {data.memberNames.length > 0 && (
        <section className="card p-6">
          <h2 className="mb-4 text-base font-bold text-ink">Representatives</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.memberNames.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-2.5"
              >
                <span className="text-sm font-medium text-ink">{m.name}</span>
                {m.role && <Badge text={m.role} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Events */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Events</h2>
        </div>
        {events === null ? (
          <Spinner />
        ) : events.length === 0 ? (
          <EmptyState title="No events yet" />
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="py-3">
                <p className="text-sm font-medium text-ink">{e.title}</p>
                <p className="text-xs text-muted">
                  {e.date ? formatDate(e.date) : e.schedule ? `Tentative: ${e.schedule}` : "Date TBD"}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming bookings */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Upcoming bookings</h2>
          <Link to="/bookings" className="text-sm font-semibold text-accent hover:underline">
            All bookings ›
          </Link>
        </div>
        {data.upcomingBookings.length === 0 ? (
          <EmptyState title="No upcoming bookings" />
        ) : (
          <ul className="divide-y divide-line">
            {data.upcomingBookings.map((b) => (
              <li key={b.id} className="py-3">
                <p className="text-sm font-medium text-ink">{b.title}</p>
                <p className="text-xs text-muted">
                  {b.classroom.building} — {b.classroom.name} · {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                  {b.purpose ? ` · ${b.purpose}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAddMember && (
        <Modal title="Add member" onClose={() => setShowAddMember(false)}>
          <form onSubmit={onAddMember} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                placeholder="member@college.edu"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Role">
              <select className={inputClass} value={memberRole} onChange={(e) => setMemberRole(e.target.value as "STUDENT" | "CLUB_ADMIN")}>
                <option value="STUDENT">STUDENT</option>
                {isSuperAdmin && <option value="CLUB_ADMIN">CLUB_ADMIN</option>}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddMember(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={btnPrimary}>
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}