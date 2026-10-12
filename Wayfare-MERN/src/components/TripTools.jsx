import { useEffect, useState } from "react";
import { useTrips } from "../context/TripsContext";
import { packingSchema } from "../lib/validation";
import { exportCalendar } from "../lib/exports";
export default function TripTools({ trip }) {
  const { savePacking, reload } = useTrips();
  const [items, setItems] = useState(trip.packing || []),
    [label, setLabel] = useState(""),
    [dirty, setDirty] = useState(false),
    [revision, setRevision] = useState(trip.revision),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [hours, setHours] = useState(24);
  useEffect(() => {
    if (!dirty) {
      setItems(trip.packing || []);
      setRevision(trip.revision);
    }
  }, [trip.packing, trip.revision, dirty]);
  async function action(fn, success) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card feature-card">
        <h2>Packing checklist & reminders</h2>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <fieldset disabled={busy}>
          <ul className="checklist">
            {items.map((i) => (
              <li key={i.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={i.checked}
                    onChange={(e) => {
                      setItems((v) =>
                        v.map((x) =>
                          x.id === i.id
                            ? { ...x, checked: e.target.checked }
                            : x,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  {i.label}
                </label>
                <button
                  aria-label={`Remove ${i.label}`}
                  onClick={() => {
                    setItems((v) => v.filter((x) => x.id !== i.id));
                    setDirty(true);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              if (label.trim()) {
                setItems((v) => [
                  ...v,
                  {
                    id: crypto.randomUUID(),
                    label: label.trim(),
                    checked: false,
                  },
                ]);
                setLabel("");
                setDirty(true);
              }
            }}
          >
            <label className="field">
              Packing item
              <input
                maxLength={120}
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <button className="btn btn-ghost">Add item</button>
          </form>
          <button
            className="btn btn-primary"
            disabled={!dirty}
            onClick={() =>
              action(async () => {
                const b = packingSchema.parse({ items });
                const t = await savePacking(trip.id, { ...b, revision });
                setRevision(t.revision);
                setDirty(false);
              }, "Checklist saved.")
            }
          >
            Save checklist
          </button>
          {error && (
            <button
              className="text-button"
              onClick={async () => {
                await reload();
                setDirty(false);
              }}
            >
              Reload checklist and discard draft
            </button>
          )}
          <div className="toolbar">
            <label>
              Remind me{" "}
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              >
                <option value={24}>1 day before</option>
                <option value={72}>3 days before</option>
                <option value={168}>1 week before</option>
              </select>
            </label>
            <button
              className="btn btn-ghost"
              onClick={() => {
                exportCalendar(trip, hours);
                setMessage(
                  "Calendar file downloaded. Import it into your calendar and enable notifications.",
                );
              }}
            >
              Download calendar reminder
            </button>
          </div>
          <p className="meta">
            Calendar reminders work through your calendar app after import.
            Wayfare does not send background notifications.
          </p>
        </fieldset>
      </section>
    </>
  );
}
