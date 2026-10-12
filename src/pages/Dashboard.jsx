import { useNavigate } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { formatDateRange, formatLakh, travellerLabel } from "../utils/format";

export default function Dashboard() {
  const { trips } = useTrips();
  const navigate = useNavigate();

  // Lifetime travel stats — independent of the planned trips listed below.
  const tripsTaken = 7;
  const countries = 12;
  const totalBudget = 340000;

  const upcoming = trips.find((t) => t.status === "upcoming") || trips[0];
  const rest = trips.filter((t) => t.id !== upcoming?.id);

  return (
    <div className="content">
      <section className="dash-hero">
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>
            Your travels, held in
            <br />
            one place.
          </h1>
          <p className="lede">
            {trips.length ? `${trips.length} trips behind you, one ahead. Here's where things stand.` :
              "Plan your first trip to see it appear here."}
          </p>
        </div>

        <div className="card card-sage stats-panel">
          <div className="stat-row">
            <span>Trips taken</span>
            <span className="stat-value">{tripsTaken}</span>
          </div>
          <div className="stat-row">
            <span>Countries visited</span>
            <span className="stat-value">{countries}</span>
          </div>
          <div className="stat-row">
            <span>Budget</span>
            <span className="stat-value">{formatLakh(totalBudget)}</span>
          </div>
          <button className="btn btn-primary stat-cta" onClick={() => navigate("/trips/new")}>
            Next Trip? <span className="arrow">→</span>
          </button>
        </div>
      </section>

      {upcoming && (
        <section className="section-gap">
          <span className="eyebrow">Coming up</span>
          <div className="card card-navy hero-trip-card" onClick={() => navigate(`/trips/${upcoming.id}`)}>
            <div>
              <h2>{upcoming.destination}</h2>
              <p className="meta">
                {formatDateRange(upcoming.startDate, upcoming.endDate)} · {travellerLabel(upcoming.travellers)}
              </p>
            </div>
            <span className="hero-link">
              {upcoming.heroBudgetLabel || formatLakh(upcoming.budget)} <span className="arrow">→</span>
            </span>
          </div>
        </section>
      )}

      <section className="section-gap">
        {rest.length === 0 && <p className="empty-note">No other trips yet.</p>}
        {rest.map((trip) => (
          <div key={trip.id} className="trip-list-item" onClick={() => navigate(`/trips/${trip.id}`)}>
            <div>
              <h3>{trip.destination}</h3>
              <p className="meta">
                {formatDateRange(trip.startDate, trip.endDate)} · {travellerLabel(trip.travellers)}
              </p>
            </div>
            <span className="link-arrow">→</span>
          </div>
        ))}
      </section>
    </div>
  );
}
