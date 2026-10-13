import test from "node:test";
import assert from "node:assert/strict";
import { planTrip } from "./planner.js";
import { dailyBudget, dayDate } from "../src/lib/plan.js";
import { generateItinerary } from "../src/data/sampleData.js";
import { itinerarySchema } from "../src/lib/validation.js";

const center = { lat: 48.8566, lon: 2.3522 };
const make = (prefix, n, categories) =>
  Array.from({ length: n }, (_, i) => ({
    properties: {
      name: `${prefix} ${i + 1}`,
      formatted: `${prefix} ${i + 1}, Paris, France`,
      lat: center.lat + (i % 7) * 0.004 - 0.01,
      lon: center.lon + Math.floor(i / 7) * 0.004 - 0.01,
      categories,
    },
  }));
function fakeGeocoder(seen = []) {
  return async (path, params) => {
    seen.push({ path, params });
    if (path === "v1/geocode/search")
      return {
        results: [{ formatted: "Paris, France", name: "Paris", country: "France", ...center }],
      };
    const c = params.categories;
    if (c.startsWith("catering"))
      return { features: make("Bistro", 20, ["catering", "catering.restaurant.french"]) };
    if (c.startsWith("accommodation"))
      return { features: make("Hotel", 6, ["accommodation", "accommodation.hotel"]) };
    return { features: make("Sight", 30, ["tourism", "tourism.sights.castle"]) };
  };
}
const trip = (extra = {}) => ({
  destination: "Paris",
  startDate: "2026-11-02",
  endDate: "2026-11-06",
  travellers: 2,
  budget: 100000,
  currency: "INR",
  ...extra,
});

test("typed destination is geocoded and every day gets real places, meals and a hotel", async () => {
  const seen = [];
  const plan = await planTrip({ body: trip(), geocoder: fakeGeocoder(seen), logger: {} });
  assert.equal(seen[0].path, "v1/geocode/search");
  assert.equal(plan.location.name, "Paris");
  assert.equal(plan.days.length, 5);
  const visits = plan.days.flatMap((d) => d.activities.filter((a) => a.kind === "visit"));
  assert.equal(new Set(visits.map((a) => a.title)).size, visits.length);
  assert.ok(visits.every((a) => a.title.startsWith("Sight ") && a.location));
  assert.ok(plan.days.every((d) => d.activities.some((a) => a.kind === "visit")));
  assert.ok(plan.days.every((d) => d.activities.some((a) => a.kind === "meal")));
  assert.match(plan.days[0].activities[0].title, /^Check in · Hotel/);
  assert.match(plan.days.at(-1).activities[0].title, /^Check out · Hotel/);
  assert.match(plan.days[0].title, /^Arrival · /);
  assert.match(plan.days.at(-1).title, / · Departure$/);
  assert.equal(plan.recommendations.hotels.length, 6);
  assert.equal(plan.recommendations.restaurants.length, 10);
  assert.ok(plan.recommendations.places.length > 0);
  const scheduled = new Set(visits.map((a) => a.title));
  assert.ok(plan.recommendations.places.every((p) => !scheduled.has(p.name)));
});

test("generated days are accepted by the itinerary save schema", async () => {
  const plan = await planTrip({ body: trip(), geocoder: fakeGeocoder(), logger: {} });
  assert.ok(itinerarySchema.safeParse({ revision: 0, days: plan.days }).success);
});

test("a one-day trip and a destination with few places still produce valid days", async () => {
  const sparse = async (path, params) => {
    const full = await fakeGeocoder()(path, params);
    if (path === "v2/places" && params.categories.startsWith("tourism"))
      return { features: full.features.slice(0, 2) };
    return full;
  };
  const plan = await planTrip({
    body: trip({ endDate: "2026-11-02", location: { ...center, name: "Paris" } }),
    geocoder: sparse,
    logger: {},
  });
  assert.equal(plan.days.length, 1);
  assert.equal(plan.days[0].activities.filter((a) => a.kind === "visit").length, 2);
  assert.ok(itinerarySchema.safeParse({ revision: 0, days: plan.days }).success);
});

test("falls back to null (generic itinerary) when the map service fails", async () => {
  const down = async () => {
    throw Object.assign(new Error("down"), { status: 503 });
  };
  assert.equal(await planTrip({ body: trip(), geocoder: down, logger: {} }), null);
  const none = async () => ({ results: [], features: [] });
  assert.equal(await planTrip({ body: trip(), geocoder: none, logger: {} }), null);
});

test("falls back to the broad tourism category if the specific list is rejected", async () => {
  const tried = [];
  const g = async (path, params) => {
    if (path === "v2/places") tried.push(params.categories);
    if (path === "v2/places" && params.categories.includes("heritage"))
      throw new Error("bad category");
    return fakeGeocoder()(path, params);
  };
  const plan = await planTrip({ body: trip(), geocoder: g, logger: {} });
  assert.ok(tried.includes("tourism"));
  assert.ok(plan.days[0].activities.some((a) => a.kind === "visit"));
});

test("day-wise budget adds up exactly to the trip budget in every currency", () => {
  for (const currency of ["INR", "USD", "JPY", "EUR"])
    for (const dayCount of [1, 2, 3, 7, 14, 61])
      for (const budget of [1, 999, 10000, 123456.78, 1000000007].map((b) =>
        currency === "JPY" ? Math.round(b) : b,
      )) {
        const { days, totals } = dailyBudget({ budget, currency, dayCount });
        const unit = currency === "JPY" ? 1 : 100;
        const units = (n) => Math.round(n * unit);
        assert.equal(days.length, dayCount);
        assert.equal(days.reduce((s, d) => s + units(d.total), 0), units(budget));
        for (const k of ["stay", "food", "transport", "experiences", "flex"])
          assert.equal(days.reduce((s, d) => s + units(d[k]), 0), units(totals[k]));
      }
});

test("category totals match what generateItinerary stores, and stay skips the departure day", () => {
  const g = generateItinerary({ ...trip(), preferences: [] });
  const { days, totals } = dailyBudget({ budget: 100000, currency: "INR", dayCount: 5 });
  assert.equal(totals.stay, g.stayCost);
  assert.equal(totals.food, g.foodCost);
  assert.equal(totals.transport, g.transportCost);
  assert.equal(totals.experiences, g.experiencesCost);
  assert.equal(totals.flex, g.flexFund);
  assert.equal(days.at(-1).stay, 0);
  assert.ok(days[0].transport > days[1].transport);
  assert.equal(dailyBudget({ budget: 500, currency: "INR", dayCount: 1 }).days[0].stay, 190);
});

test("dayDate advances calendar days without time-zone drift", () => {
  assert.equal(dayDate("2026-10-30", 3), "2026-11-02");
  assert.equal(dayDate("2026-12-31", 1), "2027-01-01");
  assert.equal(dayDate("", 1), "");
});
