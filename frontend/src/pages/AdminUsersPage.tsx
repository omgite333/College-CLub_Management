import { useEffect, useState } from "react";
import { listClubs, listUsers, setUserRole } from "../lib/api";
import type { AdminUserRow, ClubSummary } from "../types";
import { Alert, Field, Modal, RoleBadge, Spinner, btnPrimary, btnSecondary, inputClass } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import type { FormEvent } from "react";

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<AdminUserRow | null>(null);
  const [clubId, setClubId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (q = search) => {
    setError(null);
    listUsers(q)
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    load("");
    listClubs()
      .then(setClubs)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onMakeAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalUser || !clubId) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await setUserRole(modalUser.id, { role: "CLUB_ADMIN", clubId });
      setMsg(`${modalUser.name} is now a club admin.`);
      setModalUser(null);
      setClubId("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update role");
    } finally {
      setBusy(false);
    }
  };

  const onRemoveAdmin = async (u: AdminUserRow) => {
    if (!window.confirm(`Remove club admin access for ${u.name}? They will become a STUDENT.`)) return;
    setError(null);
    setMsg(null);
    try {
      await setUserRole(u.id, { role: "STUDENT" });
      setMsg(`${u.name} is now a student.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Access Management</h1>
          <p className="text-sm text-muted">Assign or remove club admin access.</p>
        </div>
        <input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {msg && <Alert kind="success" message={msg} />}
      {error && <Alert kind="error" message={error} />}

      {users === null && !error ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Clubs</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-5 py-3 text-bodytext">{u.email}</td>
                  <td className="px-5 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-3 text-bodytext">
                    {u.memberships.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      u.memberships.map((m) => m.club.name).join(", ")
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.id === me?.id ? (
                      <span className="text-xs text-muted">You</span>
                    ) : u.role === "CLUB_ADMIN" ? (
                      <button onClick={() => onRemoveAdmin(u)} className={btnSecondary}>
                        Remove admin access
                      </button>
                    ) : u.role === "STUDENT" ? (
                      <button onClick={() => setModalUser(u)} className={btnPrimary}>
                        Make club admin
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(users ?? []).length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted">No users found.</p>
          )}
        </div>
      )}

      {modalUser && (
        <Modal title={`Make ${modalUser.name} a club admin`} onClose={() => setModalUser(null)}>
          <form onSubmit={onMakeAdmin} className="space-y-4">
            <Field label="Assign to club">
              <select className={inputClass} value={clubId} onChange={(e) => setClubId(e.target.value)} required>
                <option value="">Select club</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalUser(null)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={busy || !clubId} className={btnPrimary}>
                Assign
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}