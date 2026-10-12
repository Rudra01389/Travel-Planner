import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { formatDateRange, travellerLabel } from "../utils/format";
import { money } from "../lib/money";
import { api } from "../lib/api";
import { today } from "../lib/validation";
export default function Dashboard() {
  const { trips, reload } = useTrips(),
    [invitations, setInvitations] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await reload();
      const d = await api("/trips/invitations");
      setInvitations(d.invitations);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api("/trips/invitations")
      .then((d) => {
        if (active) setInvitations(d.invitations);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function accept(id, action) {
    setBusy(true);
    setError("");
    try {
      await api(`/trips/${id}/${action}`, { method: "POST" });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const totals = {};
  for (const t of trips)
    totals[t.currency || "INR"] =
      (totals[t.currency || "INR"] || 0) + Number(t.budget);
  const ordered = [...trips].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const upcoming = ordered.filter((t) => t.endDate >= today(zone)),
    past = ordered.filter((t) => t.endDate < today(zone));
  return (
    <main className="content">
      <section className="dash-hero">
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>Your next chapter.</h1>
          <p className="lede">
            {trips.length
              ? `${trips.length} saved trips, all in one place.`
              : "Plan your first trip, or accept an invitation from a friend."}
          </p>
          <Link className="btn btn-primary" to="/trips/new">
            Plan a trip →
          </Link>
        </div>
        <div className="card card-sage stats-panel">
          <p>
            Trips planned: <strong>{trips.length}</strong>
          </p>
          <p>
            Destinations:{" "}
            <strong>{new Set(trips.map((t) => t.destination)).size}</strong>
          </p>
          <p>Total budgets by currency</p>
          {Object.entries(totals).map(([c, n]) => (
            <p key={c}>{money(n, c)}</p>
          ))}
          <button disabled={busy} className="btn btn-ghost" onClick={refresh}>
            {busy ? "Refreshing…" : "Refresh trips & invitations"}
          </button>
        </div>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {invitations.length > 0 && (
        <section className="card feature-card">
          <h2>You’re invited</h2>
          {invitations.map((t) => (
            <p key={t.id}>
              {t.destination} · {t.startDate}{" "}
              <button disabled={busy} onClick={() => accept(t.id, "accept")}>
                Accept
              </button>{" "}
              <button disabled={busy} onClick={() => accept(t.id, "decline")}>
                Decline
              </button>
            </p>
          ))}
        </section>
      )}
      {["Upcoming trips", "Past trips"].map((heading, i) => (
        <section className="section-gap" key={heading}>
          <h2>{heading}</h2>
          {!(i ? past : upcoming).length && (
            <p className="empty-note">
              No {i ? "past" : "upcoming"} trips yet.
            </p>
          )}
          {(i ? past : upcoming).map((t) => (
            <Link className="trip-list-item" key={t.id} to={`/trips/${t.id}`}>
              <div>
                <h3>{t.destination}</h3>
                <p>
                  {formatDateRange(t.startDate, t.endDate)} ·{" "}
                  {travellerLabel(t.travellers)}
                </p>
                {!i &&
                  (Date.parse(t.startDate) - Date.parse(today(zone))) /
                    86400000 <=
                    7 && (
                    <p className="reminder-note">
                      Coming up soon — review your checklist and documents.
                    </p>
                  )}
              </div>
              <strong>{money(t.budget, t.currency || "INR")} →</strong>
            </Link>
          ))}
        </section>
      ))}
    </main>
  );
}
