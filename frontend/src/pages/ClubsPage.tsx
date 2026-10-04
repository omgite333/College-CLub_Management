import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClubs } from "../lib/api";
import type { ClubSummary } from "../types";
import { Alert, EmptyState, Spinner, clubHex, formatDate, inputClass } from "../components/ui";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listClubs()
      .then(setClubs)
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = (clubs ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clubs</h1>
          <p className="text-sm text-muted">Explore student clubs on campus.</p>
        </div>
        <input
          placeholder="Search clubs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {error && <Alert kind="error" message={error} />}
      {clubs === null && !error ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No clubs found" hint={query ? "Try a different search." : "No clubs have been created yet."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/clubs/${c.id}`} className="card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ background: clubHex(c.id) }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h2 className="text-base font-bold text-ink">{c.name}</h2>
              </div>
              {c.description && <p className="mt-3 line-clamp-3 text-sm text-bodytext">{c.description}</p>}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                <span>{c._count.memberships} members</span>
                <span>Since {formatDate(c.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}