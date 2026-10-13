import { randomUUID } from "node:crypto";
import { place } from "./integrations.js";

// Builds a destination-specific itinerary from Geoapify / OpenStreetMap data:
// real places to visit, a hotel to check into, restaurants for lunch and
// dinner, plus recommendation lists. Never throws: when the map service is
// unavailable it returns null and trip creation keeps the generic itinerary.

const SIGHTS =
  "tourism.sights,tourism.attraction,entertainment.museum,entertainment.culture,heritage,leisure.park";

const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat),
    dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const pretty = (s) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
function typeLabel(categories = []) {
  const best = [...categories].sort((a, b) => b.length - a.length)[0];
  return best ? pretty(best.split(".").at(-1)) : "";
}

function toStop(p) {
  const s = place(p);
  return {
    name: s.name,
    address: s.address,
    lat: s.lat,
    lon: s.lon,
    type: typeLabel(s.categories),
  };
}

async function fetchPlaces(geocoder, categories, center, radius, limit) {
  const data = await geocoder("v2/places", {
    categories,
    filter: `circle:${center.lon},${center.lat},${radius}`,
    bias: `proximity:${center.lon},${center.lat}`,
    limit,
  });
  return (data.features || [])
    .map((f) => f.properties || {})
    .filter(
      (p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon),
    )
    .map(toStop);
}
const unique = (list, key) => {
  const seen = new Set();
  return list.filter((p) => {
    const k = key(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const byDistance = (center) => (a, b) =>
  distanceKm(center, a) - distanceKm(center, b);

// Greedy nearest-neighbour chain, so consecutive stops are close together and
// each day (a slice of the chain) stays in one part of town.
function chain(items, start) {
  const pool = [...items],
    out = [];
  let cur = start;
  while (pool.length) {
    let best = 0,
      bestD = Infinity;
    pool.forEach((p, i) => {
      const d = distanceKm(cur, p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    cur = pool.splice(best, 1)[0];
    out.push(cur);
  }
  return out;
}

export const stopsPerDay = (n) =>
  n === 1 ? [3] : Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 2 : 3));

const loc = (p, country) => ({
  name: p.name.slice(0, 200),
  lat: p.lat,
  lon: p.lon,
  ...(country ? { country: String(country).slice(0, 100) } : {}),
});

export function buildDays({ dayCount, center, attractions, restaurants, hotel }) {
  const counts = stopsPerDay(dayCount);
  const ordered = attractions
    .slice()
    .sort(byDistance(center))
    .slice(0, counts.reduce((a, b) => a + b, 0));
  const route = chain(ordered, center);
  const used = new Set();
  const pickMeal = (near) => {
    let pool = restaurants.filter((r) => !used.has(r));
    if (!pool.length) {
      used.clear();
      pool = restaurants;
    }
    const best = pool.slice().sort(byDistance(near))[0];
    if (best) used.add(best);
    return best;
  };
  const country = center.country;
  let cursor = 0;
  const days = counts.map((count, i) => {
    const sights = route.slice(cursor, cursor + count);
    cursor += count;
    const near = sights.length
      ? {
          lat: sights.reduce((s, p) => s + p.lat, 0) / sights.length,
          lon: sights.reduce((s, p) => s + p.lon, 0) / sights.length,
        }
      : hotel || center;
    const activities = [];
    let prev = null;
    const add = (kind, title, p, extra = "") => {
      const gap = prev ? distanceKm(prev, p) : 0;
      const hop =
        gap >= 0.1 ? ` · about ${gap.toFixed(1)} km from the previous stop` : "";
      activities.push({
        id: randomUUID(),
        kind,
        title: title.slice(0, 200),
        notes: [p.type, p.address].filter(Boolean).join(" · ").concat(extra, hop).slice(0, 1000),
        location: loc(p, country),
      });
      prev = p;
    };
    const first = i === 0,
      last = i === dayCount - 1 && dayCount > 1;
    if (hotel && first) add("stay", `Check in · ${hotel.name}`, hotel);
    if (hotel && last) add("stay", `Check out · ${hotel.name}`, hotel);
    const half = Math.ceil(sights.length / 2);
    sights.slice(0, half).forEach((p) => add("visit", p.name, p));
    const lunch = pickMeal(near);
    if (lunch) add("meal", `Lunch · ${lunch.name}`, lunch);
    sights.slice(half).forEach((p) => add("visit", p.name, p));
    if (!last) {
      const dinner = pickMeal(near);
      if (dinner) add("meal", `Dinner · ${dinner.name}`, dinner);
    }
    if (!activities.length)
      activities.push({
        id: randomUUID(),
        kind: "visit",
        title: "Free time: pick something from the recommendations",
        notes: "",
      });
    const names = sights.map((p) => p.name);
    const base = names.length
      ? names.slice(0, 2).join(" & ") +
        (names.length > 2 ? ` +${names.length - 2} more` : "")
      : "Free day";
    const title =
      dayCount > 1 && first
        ? `Arrival · ${base}`
        : last
          ? `${base} · Departure`
          : base;
    return {
      id: `day-${i + 1}`,
      label: `Day ${i + 1}`,
      title: title.slice(0, 200),
      activities,
    };
  });
  return { days, scheduled: new Set(route) };
}

export async function planTrip({ body, geocoder, logger = console }) {
  const quiet = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      logger.warn?.("[Wayfare planner]", e.message);
      return [];
    }
  };
  try {
    let center = body.location;
    if (!center) {
      const r = await geocoder("v1/geocode/search", {
        text: body.destination,
        format: "json",
        limit: 1,
      });
      const hit = (r.results || []).find(
        (x) => Number.isFinite(x.lat) && Number.isFinite(x.lon),
      );
      if (!hit) return null;
      const p = place(hit);
      center = {
        name: p.name.slice(0, 200),
        lat: p.lat,
        lon: p.lon,
        ...(p.country ? { country: p.country.slice(0, 100) } : {}),
      };
    }
    const dayCount =
      Math.round((Date.parse(body.endDate) - Date.parse(body.startDate)) / 86400000) + 1;
    const need = stopsPerDay(dayCount).reduce((a, b) => a + b, 0);
    const [sights, food, stays] = await Promise.all([
      quiet(async () => {
        let list = [];
        try {
          list = await fetchPlaces(geocoder, SIGHTS, center, 15000, 60);
        } catch {
          list = await fetchPlaces(geocoder, "tourism", center, 15000, 60);
        }
        if (unique(list, (p) => p.name.toLowerCase()).length < Math.min(need, 8))
          list = list.concat(
            await fetchPlaces(geocoder, "tourism", center, 40000, 60),
          );
        return list;
      }),
      quiet(() => fetchPlaces(geocoder, "catering.restaurant", center, 10000, 40)),
      quiet(() => fetchPlaces(geocoder, "accommodation.hotel", center, 10000, 20)),
    ]);
    const attractions = unique(sights, (p) => p.name.toLowerCase());
    const restaurants = unique(
      food,
      (p) => `${p.name.toLowerCase()}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}`,
    );
    const hotels = unique(stays, (p) => p.name.toLowerCase()).sort(byDistance(center));
    if (!attractions.length && !restaurants.length && !hotels.length) return null;
    const { days, scheduled } = buildDays({
      dayCount,
      center,
      attractions,
      restaurants,
      hotel: hotels[0],
    });
    return {
      location: center,
      days,
      recommendations: {
        hotels: hotels.slice(0, 8),
        restaurants: restaurants.sort(byDistance(center)).slice(0, 10),
        places: attractions
          .filter((p) => !scheduled.has(p))
          .sort(byDistance(center))
          .slice(0, 10),
      },
    };
  } catch (e) {
    logger.warn?.("[Wayfare planner]", e.message);
    return null;
  }
}
