import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { formatDateRange, travellerLabel } from "../utils/format";
import { useMoney } from "../lib/money";
import CurrencyPicker, { RateNote } from "../components/CurrencyPicker";
import ItineraryEditor from "../components/ItineraryEditor";
import TripMap from "../components/TripMap";
import TripTools from "../components/TripTools";
import { exportPdf } from "../lib/exports";
import { useAuth } from "../context/AuthContext";

export default function TripDetails() {
  const { id } = useParams();
  const { getTrip, addDocument, removeDocument, deleteTrip, reload } =
    useTrips();
  const navigate = useNavigate();
  const trip = getTrip(id);
  const { user } = useAuth();
  const conversion = useMoney(trip?.currency || "INR");
  const [newPlace, setNewPlace] = useState(null),
    [confirmDelete, setConfirmDelete] = useState(false);
  const clearPlace = useCallback(() => setNewPlace(null), []);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await removeDocument(trip.id, id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!trip) {
    return (
      <div className="content">
        <p className="empty-note">
          Trip not found. <a href="/dashboard">Back to dashboard</a>
        </p>
      </div>
    );
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.size > 2 * 1024 * 1024 ||
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
    ) {
      setError("Choose a PDF, PNG, or JPEG file up to 2 MB.");
      e.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await addDocument(trip.id, { name: file.name, url: reader.result });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setError("Unable to read this file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function openDoc(doc) {
    window.open(doc.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="content">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="trip-header">
        <div>
          <span className="eyebrow">{trip.tagline}</span>
          <h1>{trip.destination}</h1>
          <p className="meta">
            {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
            {travellerLabel(trip.travellers)}
          </p>
        </div>
        <span className="budget-total">{conversion.format(trip.budget)}</span>
      </div>

      <div className="toolbar">
        <CurrencyPicker
          value={conversion.display}
          onChange={conversion.setDisplay}
        />
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await exportPdf(trip);
            } catch {
              setError("PDF could not be generated. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Download itinerary PDF
        </button>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await reload();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh shared trip
        </button>
      </div>
      <RateNote conversion={conversion} base={trip.currency} />
      <ItineraryEditor
        trip={trip}
        newPlace={newPlace}
        onPlaceUsed={clearPlace}
      />
      <TripMap trip={trip} onAdd={setNewPlace} />
      <TripTools trip={trip} />
      <h2 className="info-heading">Every detail, held in view.</h2>
      <div className="info-grid">
        <div className="info-card card-white">
          <h3>Your stay</h3>
          <p>{trip.accommodationNote}</p>
        </div>
        <div className="info-card card-white">
          <h3>Eat like you're local</h3>
          <p>{trip.foodNote}</p>
        </div>
        <div className="info-card card-sage">
          <h3>Packing basics</h3>
          <p>{trip.packingNote}</p>
        </div>
        <div className="info-card card-peach">
          <h3>Your budget, balanced</h3>
          <p>
            Stay {conversion.format(trip.stayCost)} · Food{" "}
            {conversion.format(trip.foodCost)} · Transport{" "}
            {conversion.format(trip.transportCost)} · Experiences{" "}
            {conversion.format(trip.experiencesCost)} · Flex fund{" "}
            {conversion.format(trip.flexFund)}.
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
        {trip.documents.length === 0 && (
          <p className="empty-note">No documents uploaded yet.</p>
        )}
        {trip.documents.map((doc) => (
          <div className="doc-row" key={doc.id}>
            <div className="doc-name">
              <span>{doc.name}</span>
              <span className="doc-status">{doc.status}</span>
            </div>
            <div className="doc-actions">
              <button
                className="view-link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => openDoc(doc)}
              >
                Download →
              </button>
              <button
                className="remove"
                disabled={busy}
                onClick={() => remove(doc.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="upload-row">
        <label className="upload-label">
          {busy ? "Saving…" : "+ Add document (PDF / image, max 2 MB)"}
          <input
            disabled={busy}
            accept="application/pdf,image/png,image/jpeg"
            type="file"
            onChange={handleUpload}
          />
        </label>
      </div>

      {trip.ownerId === user.id && (
        <section className="feature-card">
          <button
            className="text-button danger"
            onClick={() => setConfirmDelete((v) => !v)}
          >
            Delete trip
          </button>
          {confirmDelete && (
            <p>
              Delete this trip, shared expenses, and all its documents
              permanently?{" "}
              <button
                disabled={busy}
                className="btn danger"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await deleteTrip(trip.id);
                    navigate("/dashboard");
                  } catch (e) {
                    setError(e.message);
                    setBusy(false);
                  }
                }}
              >
                Confirm delete
              </button>
            </p>
          )}
        </section>
      )}
      <div className="section-gap" style={{ marginTop: 48 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate(`/trips/${trip.id}/expenses`)}
        >
          Manage expenses <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}
