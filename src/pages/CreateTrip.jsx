import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { generateItinerary } from "../data/sampleData";

const DEFAULT_PREFS = [
  "Slow mornings, minimal rushing",
  "Local food over tourist spots",
  "Room for spontaneous detours",
  "Budget-conscious throughout",
];

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function CreateTrip() {
  const { addTrip } = useTrips();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    destination: "Amalfi Coast, Italy",
    startDate: "2026-06-12",
    endDate: "2026-06-18",
    travellers: 2,
    budget: 340000,
  });
  const [prefs, setPrefs] = useState(DEFAULT_PREFS.map((label) => ({ label, active: true })));
  const [focusField, setFocusField] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function togglePref(idx) {
    setPrefs((p) => p.map((pr, i) => (i === idx ? { ...pr, active: !pr.active } : pr)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.destination.trim()) return;
    const trip = generateItinerary({
      ...form,
      preferences: prefs.filter((p) => p.active).map((p) => p.label),
    });
    addTrip(trip);
    navigate(`/trips/${trip.id}`);
  }

  return (
    <div className="content">
      <div className="create-grid">
        <div>
          <span className="eyebrow">New trip</span>
          <h1>Where to next?</h1>
          <p className="lede">
            Tell us when, where, and how you like to travel. We shape the rest — from sunlit lunch
            tables to the right pair of shoes.
          </p>

          <div className="pref-list">
            {prefs.map((pref, idx) => (
              <div
                className="pref-item"
                key={pref.label}
                style={{ opacity: pref.active ? 1 : 0.4, cursor: "pointer" }}
                onClick={() => togglePref(idx)}
              >
                <span className="dash">—</span>
                <span>{pref.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="card card-sage form-panel" onSubmit={handleSubmit}>
          <h4>Your next escape</h4>

          <div className="field">
            <label>Main location</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              placeholder="Where are you headed?"
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Start date</label>
              {focusField === "startDate" ? (
                <input
                  type="date"
                  autoFocus
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  onBlur={() => setFocusField(null)}
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  value={formatFullDate(form.startDate) || "Select date"}
                  onFocus={() => setFocusField("startDate")}
                />
              )}
            </div>
            <div className="field">
              <label>End date</label>
              {focusField === "endDate" ? (
                <input
                  type="date"
                  autoFocus
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  onBlur={() => setFocusField(null)}
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  value={formatFullDate(form.endDate) || "Select date"}
                  onFocus={() => setFocusField("endDate")}
                />
              )}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>People</label>
              {focusField === "travellers" ? (
                <input
                  type="number"
                  autoFocus
                  min="1"
                  value={form.travellers}
                  onChange={(e) => update("travellers", e.target.value)}
                  onBlur={() => setFocusField(null)}
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  value={`${form.travellers} traveller${Number(form.travellers) === 1 ? "" : "s"}`}
                  onFocus={() => setFocusField("travellers")}
                />
              )}
            </div>
            <div className="field">
              <label>Budget</label>
              {focusField === "budget" ? (
                <input
                  type="number"
                  autoFocus
                  min="0"
                  step="1000"
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  onBlur={() => setFocusField(null)}
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  value={`₹ ${(Number(form.budget) / 100000).toFixed(1)} L total`}
                  onFocus={() => setFocusField("budget")}
                />
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Build my itinerary <span className="arrow">→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
