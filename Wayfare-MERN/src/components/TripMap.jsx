import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
export default function TripMap({ trip, onAdd }) {
  const node = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    routeLayer = useRef(null);
  const [places, setPlaces] = useState([]),
    [category, setCategory] = useState("tourism"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [routeInfo, setRouteInfo] = useState("");
  const center = trip.location;
  useEffect(() => {
    if (!center) return;
    const instance = L.map(node.current).setView([center.lat, center.lon], 13);
    map.current = instance;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    L.circleMarker([center.lat, center.lon], { radius: 9, color: "#c1663f" })
      .addTo(instance)
      .bindPopup(document.createTextNode(trip.destination));
    return () => {
      instance.remove();
      map.current = null;
    };
  }, [center, trip.destination]);
  useEffect(() => {
    if (!center) return;
    let active = true;
    setBusy(true);
    setError("");
    api(
      `/places/nearby?lat=${center.lat}&lon=${center.lon}&category=${category}`,
    )
      .then((d) => {
        if (active) setPlaces(d.places);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [center, category]);
  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    for (const p of places) {
      L.circleMarker([p.lat, p.lon], { radius: 6, color: "#263548" })
        .addTo(layer.current)
        .bindPopup(document.createTextNode(p.name));
    }
  }, [places]);
  async function route(day) {
    const points = day.activities
      .filter((a) => a.location)
      .map((a) => a.location);
    if (points.length < 2) {
      setError("Add at least two places to this day to draw a walking route.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const d = await api("/places/route", {
        method: "POST",
        body: { points: points.slice(0, 10), mode: "walk" },
      });
      if (routeLayer.current) routeLayer.current.remove();
      routeLayer.current = L.geoJSON(d.route, {
        style: { color: "#c1663f", weight: 5 },
      }).addTo(map.current);
      map.current.fitBounds(routeLayer.current.getBounds(), {
        padding: [20, 20],
      });
      const p = d.route.features?.[0]?.properties;
      setRouteInfo(
        `Walking route: ${((p?.distance || 0) / 1000).toFixed(1)} km · approximately ${Math.round((p?.time || 0) / 60)} minutes. Routes support up to 10 stops.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!center)
    return (
      <section className="card feature-card">
        <h2>Map & nearby places</h2>
        <p>
          This trip was created without coordinates. Create a trip using a
          destination search result to enable the map.
        </p>
      </section>
    );
  return (
    <section className="card feature-card">
      <h2>Map & nearby recommendations</h2>
      <p>
        Nearby places from Geoapify / OpenStreetMap. Confirm hours and
        availability before visiting.
      </p>
      <div
        ref={node}
        className="trip-map"
        aria-label={`Interactive map of ${trip.destination}`}
      />
      <div className="toolbar">
        <label>
          Explore{" "}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="tourism">Attractions</option>
            <option value="catering.restaurant">Restaurants</option>
            <option value="leisure.park">Parks</option>
            <option value="entertainment">Entertainment</option>
          </select>
        </label>
        {trip.days.map((d) => (
          <button
            key={d.id}
            disabled={busy}
            className="btn btn-ghost"
            onClick={() => route(d)}
          >
            Route: {d.label}
          </button>
        ))}
      </div>
      {routeInfo && <p role="status">{routeInfo}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Loading places / route…</p>}
      <div className="place-grid">
        {places.map((p, i) => (
          <article key={i}>
            <h3>{p.name}</h3>
            <p>{p.address}</p>
            <button
              className="text-button"
              onClick={() => {
                map.current.setView([p.lat, p.lon], 16);
              }}
            >
              Show on map
            </button>{" "}
            <button className="text-button" onClick={() => onAdd(p)}>
              Add to itinerary
            </button>
          </article>
        ))}
      </div>
      {!busy && !places.length && !error && (
        <p>No places found nearby. Try another category.</p>
      )}
    </section>
  );
}
