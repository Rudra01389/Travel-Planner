import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { useAuth } from "../context/AuthContext";
import { tripSchema, today } from "../lib/validation";
import { api } from "../lib/api";
import { rate } from "../lib/money";
import CurrencyPicker from "../components/CurrencyPicker";
export default function CreateTrip() {
  const { user } = useAuth(),
    { addTrip } = useTrips(),
    navigate = useNavigate();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [form, setForm] = useState({
    destination: "",
    startDate: today(zone),
    endDate: today(zone),
    travellers: 1,
    budget: 10000,
    currency: user.currency || "INR",
    timeZone: zone,
  });
  const [prefs, setPrefs] = useState((user.preferences || []).join("\n")),
    [places, setPlaces] = useState([]),
    [searchError, setSearchError] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  useEffect(() => {
    let active = true;
    if (form.destination.length < 2 || form.location) {
      setPlaces([]);
      return;
    }
    const t = setTimeout(() => {
      api(`/places/search?q=${encodeURIComponent(form.destination)}`)
        .then((d) => {
          if (active) {
            setPlaces(d.places);
            setSearchError("");
          }
        })
        .catch((e) => {
          if (active) setSearchError(e.message);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [form.destination, form.location]);
  async function changeCurrency(to) {
    setBusy(true);
    setError("");
    try {
      const q = await rate(form.currency, to);
      const decimals = new Intl.NumberFormat("en", {
        style: "currency",
        currency: to,
      }).resolvedOptions().maximumFractionDigits;
      const amount = Number((Number(form.budget) * q.rate).toFixed(decimals));
      setForm((f) => ({ ...f, budget: amount, currency: to }));
      setMessage(
        `Budget converted using the ${q.date || "current"} reference rate.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = tripSchema.parse({
        ...form,
        preferences: prefs
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      const trip = await addTrip(body);
      navigate(`/trips/${trip.id}`);
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content">
      <div className="create-grid">
        <section>
          <span className="eyebrow">New trip</span>
          <h1>Where to next?</h1>
          <p className="lede">
            Plan a route, set a total budget, and leave room to wander.
          </p>
          <p>
            Search for a city to enable nearby recommendations and routes. You
            can also type a destination manually.
          </p>
        </section>
        <form className="card card-sage form-panel" onSubmit={submit}>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <fieldset disabled={busy}>
            <label className="field">
              Destination
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.destination}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    destination: e.target.value,
                    location: undefined,
                  }))
                }
                autoComplete="off"
              />
            </label>
            {places.length > 0 && (
              <ul
                className="search-results"
                aria-label="Destination suggestions"
              >
                {places.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          destination: p.name.slice(0, 120),
                          location: p,
                        }));
                        setPlaces([]);
                      }}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchError && <p className="meta">{searchError}</p>}
            <div className="field-row">
              <label className="field">
                Start date
                <input
                  type="date"
                  min={today(zone)}
                  required
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </label>
              <label className="field">
                End date
                <input
                  type="date"
                  min={form.startDate || today(zone)}
                  required
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                Travellers
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  required
                  value={form.travellers}
                  onChange={(e) => update("travellers", e.target.value)}
                />
              </label>
              <label className="field">
                Total group budget
                <input
                  type="number"
                  min={form.currency === "JPY" ? 1 : 0.01}
                  max={1e9}
                  step={form.currency === "JPY" ? 1 : 0.01}
                  required
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                />
              </label>
            </div>
            <CurrencyPicker
              label="Budget currency (converts the amount)"
              value={form.currency}
              onChange={changeCurrency}
            />
            <label className="field">
              Travel preferences (one per line, up to 10)
              <textarea
                maxLength={1500}
                value={prefs}
                onChange={(e) => setPrefs(e.target.value)}
                placeholder="Local food\nMuseums\nSlow mornings"
              />
            </label>
            <button className="btn btn-primary">
              {busy ? "Saving…" : "Create trip →"}
            </button>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
