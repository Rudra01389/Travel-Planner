import { dailyBudget, dayDate } from "../lib/plan";
import { formatShortDate } from "../utils/format";
import { normalizedDays } from "./ItineraryEditor";

const BUDGET_COLUMNS = [
  ["stay", "Stay"],
  ["food", "Food"],
  ["transport", "Transport"],
  ["experiences", "Experiences"],
  ["flex", "Flex"],
];
const KIND_LABEL = { visit: "Visit", meal: "Eat", stay: "Hotel" };
const mapLink = (p) =>
  `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;

function MapLink({ place }) {
  if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lon)) return null;
  return (
    <a href={mapLink(place)} target="_blank" rel="noreferrer">
      Open map
    </a>
  );
}

function PlaceList({ title, hint, items }) {
  if (!items?.length) return null;
  return (
    <div className="plan-reco">
      <h3>{title}</h3>
      {hint && <p className="meta">{hint}</p>}
      <ul>
        {items.map((p, i) => (
          <li key={`${p.name}-${i}`}>
            <strong>{p.name}</strong>
            {(p.type || p.address) && (
              <span className="meta">
                {[p.type, p.address].filter(Boolean).join(" · ")}
              </span>
            )}
            <MapLink place={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TripPlan({ trip, conversion }) {
  const days = normalizedDays(trip.days || []);
  const { days: split, totals } = dailyBudget({
    budget: trip.budget,
    currency: trip.currency,
    dayCount: days.length,
  });
  const fmt = conversion.format;
  const spentOn = (date) =>
    (trip.expenses || [])
      .filter((e) => e.date === date)
      .reduce((s, e) => s + Number(e.amount), 0);
  const dates = days.map((_, i) => dayDate(trip.startDate, i));
  const spentTotal = dates.reduce((s, d) => s + (d ? spentOn(d) : 0), 0);
  const nights = Math.max(1, days.length - 1);
  const reco = trip.recommendations;
  const hasReco =
    reco && (reco.hotels?.length || reco.restaurants?.length || reco.places?.length);

  return (
    <>
      <section className="card feature-card plan-card">
        <h2>Your plan for {trip.destination}</h2>
        <p>
          Places to visit, where to eat and where to stay, day by day, with
          each day's share of your budget.
        </p>
        <div className="plan-days">
          {days.map((d, i) => (
            <article className="plan-day" key={d.id}>
              <header>
                <div>
                  <span className="eyebrow">
                    {d.label}
                    {dates[i] ? ` · ${formatShortDate(dates[i])}` : ""}
                  </span>
                  <h3>{d.title}</h3>
                </div>
                <span className="plan-day-budget">{fmt(split[i]?.total)}</span>
              </header>
              <ol className="plan-stops">
                {d.activities.map((a) => (
                  <li key={a.id}>
                    <span className={`plan-kind plan-kind-${a.kind || "visit"}`}>
                      {KIND_LABEL[a.kind] || "Visit"}
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      {a.notes && <span className="meta">{a.notes}</span>}
                      {a.location && <MapLink place={a.location} />}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="meta">
                {BUDGET_COLUMNS.filter(([k]) => split[i]?.[k] > 0)
                  .map(([k, label]) => `${label} ${fmt(split[i][k])}`)
                  .join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card feature-card plan-card">
        <h2>Day-wise budget</h2>
        <p>
          Your total budget of {fmt(trip.budget)} split across {days.length}{" "}
          {days.length === 1 ? "day" : "days"}. Stay is charged per night, and
          arrival and departure days carry more transport. Expenses you log
          show up under Spent.
        </p>
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead>
              <tr>
                <th>Day</th>
                {BUDGET_COLUMNS.map(([k, label]) => (
                  <th key={k}>{label}</th>
                ))}
                <th>Total</th>
                <th>Spent</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d.id}>
                  <th scope="row">
                    {d.label}
                    {dates[i] && (
                      <span className="meta">{formatShortDate(dates[i])}</span>
                    )}
                  </th>
                  {BUDGET_COLUMNS.map(([k]) => (
                    <td key={k}>{fmt(split[i]?.[k])}</td>
                  ))}
                  <td>
                    <strong>{fmt(split[i]?.total)}</strong>
                  </td>
                  <td>{fmt(dates[i] ? spentOn(dates[i]) : 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Trip total</th>
                {BUDGET_COLUMNS.map(([k]) => (
                  <td key={k}>{fmt(totals[k])}</td>
                ))}
                <td>
                  <strong>{fmt(trip.budget)}</strong>
                </td>
                <td>{fmt(spentTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card feature-card plan-card">
        <h2>Recommended hotels, restaurants and places</h2>
        {hasReco ? (
          <div className="plan-reco-grid">
            <PlaceList
              title="Where to stay"
              hint={`Your stay budget works out to about ${fmt(totals.stay / nights)} per night for the group.`}
              items={reco.hotels}
            />
            <PlaceList title="Where to eat" items={reco.restaurants} />
            <PlaceList title="More places to visit" items={reco.places} />
          </div>
        ) : (
          <p>
            No recommendations were saved for this trip. Use the map below to
            browse attractions, restaurants and hotels near {trip.destination}.
          </p>
        )}
      </section>
    </>
  );
}
