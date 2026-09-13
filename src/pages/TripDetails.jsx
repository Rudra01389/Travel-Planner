import { useNavigate, useParams } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { formatDateRange, formatINR, formatLakh, travellerLabel } from "../utils/format";

export default function TripDetails() {
  const { id } = useParams();
  const { getTrip, addDocument, removeDocument } = useTrips();
  const navigate = useNavigate();
  const trip = getTrip(id);

  if (!trip) {
    return (
      <div className="content">
        <p className="empty-note">
          Trip not found. <a href="/">Back to dashboard</a>
        </p>
      </div>
    );
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addDocument(trip.id, {
        name: file.name,
        status: "Uploaded just now",
        url: reader.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openDoc(doc) {
    if (doc.url) {
      const w = window.open();
      w.document.write(
        doc.url.startsWith("data:image")
          ? `<img src="${doc.url}" style="max-width:100%" />`
          : `<iframe src="${doc.url}" style="width:100%;height:100%;border:none"></iframe>`
      );
    } else {
      alert(`${doc.name} — no file uploaded yet. Use "Add document" below to attach one.`);
    }
  }

  return (
    <div className="content">
      <div className="trip-header">
        <div>
          <span className="eyebrow">{trip.tagline}</span>
          <h1>{trip.destination}</h1>
          <p className="meta">
            {formatDateRange(trip.startDate, trip.endDate)} · {travellerLabel(trip.travellers)}
          </p>
        </div>
        <span className="budget-total">{trip.heroBudgetLabel || formatLakh(trip.budget)}</span>
      </div>

      <div className="card card-navy itinerary-band">
        <h2>A route with room to wander.</h2>
        {trip.days.length === 0 ? (
          <p className="empty-note" style={{ color: "#c7d0dd" }}>
            No itinerary yet — generate one from the New Trip page.
          </p>
        ) : (
          <div className="day-cards">
            {trip.days.map((day) => (
              <div className="day-card" key={day.id}>
                <span className="day-label">{day.label}</span>
                <h3>{day.title}</h3>
                <p className="day-meta">{day.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="info-heading">Every detail, held in view.</h2>
      <div className="info-grid">
        <div className="info-card card-white">
          <h3>Stay by the water</h3>
          <p>{trip.accommodationNote}</p>
        </div>
        <div className="info-card card-white">
          <h3>Eat like you're local</h3>
          <p>{trip.foodNote}</p>
        </div>
        <div className="info-card card-sage">
          <h3>Pack for sun &amp; stone</h3>
          <p>{trip.packingNote}</p>
        </div>
        <div className="info-card card-peach">
          <h3>Your budget, balanced</h3>
          <p>
            Stay {formatINR(trip.stayCost)} · Food {formatINR(trip.foodCost)} · Transport{" "}
            {formatINR(trip.transportCost)} · Experiences {formatINR(trip.experiencesCost)} · Flex fund{" "}
            {formatINR(trip.flexFund)}.
          </p>
        </div>
      </div>

      <h2 className="info-heading">Travel tips</h2>
      <div className="info-grid">
        <div className="info-card card-white">
          <h3>Best time to visit</h3>
          <p>{trip.bestTime}</p>
        </div>
        <div className="info-card card-white">
          <h3>Weather</h3>
          <p>{trip.weather}</p>
        </div>
        <div className="info-card card-white" style={{ gridColumn: "1 / -1" }}>
          <h3>Good to know</h3>
          <p>{trip.localInfo}</p>
        </div>
      </div>

      <h2 className="info-heading">Documents</h2>
      <div className="doc-list">
        {trip.documents.length === 0 && <p className="empty-note">No documents uploaded yet.</p>}
        {trip.documents.map((doc) => (
          <div className="doc-row" key={doc.id}>
            <div className="doc-name">
              <span>{doc.name}</span>
              <span className="doc-status">{doc.status}</span>
            </div>
            <div className="doc-actions">
              <button className="view-link" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => openDoc(doc)}>
                View →
              </button>
              <button className="remove" onClick={() => removeDocument(trip.id, doc.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="upload-row">
        <label className="upload-label">
          + Add document
          <input type="file" onChange={handleUpload} />
        </label>
      </div>

      <div className="section-gap" style={{ marginTop: 48 }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/trips/${trip.id}/expenses`)}>
          Manage expenses <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}
