import { useEffect, useState } from "react";
import { useTrips } from "../context/TripsContext";
import { itinerarySchema } from "../lib/validation";
export function normalizedDays(days) {
  return days.map((d) => ({
    id: d.id,
    label: d.label,
    title: d.title,
    activities: Array.isArray(d.activities)
      ? d.activities
      : [{ id: `legacy-${d.id}`, title: d.activities || d.title, notes: "" }],
  }));
}
export default function ItineraryEditor({ trip, newPlace, onPlaceUsed }) {
  const { saveItinerary, reload } = useTrips();
  const [days, setDays] = useState(() => normalizedDays(trip.days)),
    [revision, setRevision] = useState(trip.revision),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(trip.days[0].id),
    [drag, setDrag] = useState(null);
  useEffect(() => {
    if (!dirty) {
      setDays(normalizedDays(trip.days));
      setRevision(trip.revision);
    }
  }, [trip.days, trip.revision, dirty]);
  useEffect(() => {
    if (newPlace) {
      setDays((ds) =>
        ds.map((d) =>
          d.id === selected
            ? {
                ...d,
                activities: [
                  ...d.activities,
                  {
                    id: crypto.randomUUID(),
                    title: newPlace.name,
                    notes: newPlace.address || "",
                    location: newPlace,
                  },
                ],
              }
            : d,
        ),
      );
      setDirty(true);
      setMessage("Place added to your draft. Save the itinerary to keep it.");
      onPlaceUsed();
    }
  }, [newPlace, selected, onPlaceUsed]);
  function update(id, aid, key, value) {
    setDays((ds) =>
      ds.map((d) =>
        d.id === id
          ? {
              ...d,
              activities: d.activities.map((a) =>
                a.id === aid ? { ...a, [key]: value } : a,
              ),
            }
          : d,
      ),
    );
    setDirty(true);
  }
  function move(from, aid, to, index) {
    setDays((ds) => {
      const a = ds
        .find((d) => d.id === from)
        ?.activities.find((a) => a.id === aid);
      if (!a) return ds;
      const result = ds.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== aid),
      }));
      const destination = result.find((d) => d.id === to);
      destination.activities.splice(
        Math.max(0, Math.min(index, destination.activities.length)),
        0,
        a,
      );
      return result;
    });
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const b = itinerarySchema.parse({ days, revision });
      const t = await saveItinerary(trip.id, b);
      setRevision(t.revision);
      setDirty(false);
      setMessage("Itinerary saved.");
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card feature-card">
      <h2>Your itinerary</h2>
      <p>
        Drag activities between days, or use the move buttons. Save to share
        your changes.
      </p>
      <label className="field">
        Add recommended places to{" "}
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}{" "}
          <button
            onClick={async () => {
              await reload();
              setDirty(false);
            }}
          >
            Reload saved version (discard draft)
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy}>
        <div className="editor-days">
          {days.map((day, di) => (
            <article
              className="editor-day"
              key={day.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag)
                  move(drag.day, drag.id, day.id, day.activities.length);
                setDrag(null);
              }}
            >
              <h3>{day.label}</h3>
              <label className="field">
                Day title
                <input
                  maxLength={200}
                  value={day.title}
                  onChange={(e) => {
                    setDays((ds) =>
                      ds.map((d) =>
                        d.id === day.id ? { ...d, title: e.target.value } : d,
                      ),
                    );
                    setDirty(true);
                  }}
                />
              </label>
              {day.activities.map((a, ai) => (
                <div
                  className="activity"
                  key={a.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", a.id);
                    setDrag({ day: day.id, id: a.id });
                  }}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (drag) move(drag.day, drag.id, day.id, ai);
                    setDrag(null);
                  }}
                >
                  <span className="meta">↕ Activity {ai + 1}</span>
                  <label className="field">
                    Activity
                    <input
                      required
                      maxLength={200}
                      value={a.title}
                      onChange={(e) =>
                        update(day.id, a.id, "title", e.target.value)
                      }
                    />
                  </label>
                  <label className="field">
                    Notes
                    <textarea
                      maxLength={1000}
                      value={a.notes || ""}
                      onChange={(e) =>
                        update(day.id, a.id, "notes", e.target.value)
                      }
                    />
                  </label>
                  {a.location && <p className="meta">{a.location.name}</p>}
                  <div className="toolbar">
                    <button
                      type="button"
                      disabled={ai === 0}
                      onClick={() => move(day.id, a.id, day.id, ai - 1)}
                      aria-label={`Move ${a.title} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={ai === day.activities.length - 1}
                      onClick={() => move(day.id, a.id, day.id, ai + 1)}
                      aria-label={`Move ${a.title} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={di === 0}
                      onClick={() =>
                        move(
                          day.id,
                          a.id,
                          days[di - 1].id,
                          days[di - 1].activities.length,
                        )
                      }
                    >
                      Previous day
                    </button>
                    <button
                      type="button"
                      disabled={di === days.length - 1}
                      onClick={() =>
                        move(
                          day.id,
                          a.id,
                          days[di + 1].id,
                          days[di + 1].activities.length,
                        )
                      }
                    >
                      Next day
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDays((ds) =>
                          ds.map((d) =>
                            d.id === day.id
                              ? {
                                  ...d,
                                  activities: d.activities.filter(
                                    (v) => v.id !== a.id,
                                  ),
                                }
                              : d,
                          ),
                        );
                        setDirty(true);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setDays((ds) =>
                    ds.map((d) =>
                      d.id === day.id
                        ? {
                            ...d,
                            activities: [
                              ...d.activities,
                              {
                                id: crypto.randomUUID(),
                                title: "New activity",
                                notes: "",
                              },
                            ],
                          }
                        : d,
                    ),
                  );
                  setDirty(true);
                }}
              >
                + Add activity
              </button>
            </article>
          ))}
        </div>
        <button className="btn btn-primary" disabled={!dirty} onClick={save}>
          {busy ? "Saving…" : "Save itinerary"}
        </button>
        {dirty && <p className="meta">You have unsaved changes.</p>}
      </fieldset>
    </section>
  );
}
