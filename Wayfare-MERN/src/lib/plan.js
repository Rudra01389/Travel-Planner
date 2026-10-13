// Day-wise budget split. Pure and shared by the UI and the server tests.
// Category shares match generateItinerary(): stay 38%, food 22%, transport 14%,
// experiences 18%, and the remainder is the flex fund (8%).
const SHARES = { stay: 0.38, food: 0.22, transport: 0.14, experiences: 0.18 };

const unitsPerCurrency = (currency) => (currency === "JPY" ? 1 : 100);

// Split `total` integer units across `weights`; the rounding remainder goes to
// the largest fractional parts so the pieces always add up exactly.
function splitUnits(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => [v - Math.floor(v), i])
    .sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--)
    out[order[k][1]] += 1;
  return out;
}

export function dailyBudget({ budget, currency = "INR", dayCount }) {
  const n = Math.max(1, Number(dayCount) || 1);
  const unit = unitsPerCurrency(currency);
  const total = Math.round(Number(budget || 0) * unit);
  const part = (p) => Math.floor(total * p);
  const totals = {
    stay: part(SHARES.stay),
    food: part(SHARES.food),
    transport: part(SHARES.transport),
    experiences: part(SHARES.experiences),
  };
  totals.flex =
    total - totals.stay - totals.food - totals.transport - totals.experiences;
  const equal = Array(n).fill(1);
  // Stay is paid per night, so the departure day carries none (unless the trip
  // is a single day). Arrival/departure days lean on transport and go light on
  // experiences.
  const stayW = equal.map((_, i) => (n > 1 && i === n - 1 ? 0 : 1));
  const transportW = equal.map((_, i) => (n > 1 && (i === 0 || i === n - 1) ? 2 : 1));
  const expW = equal.map((_, i) => (n > 2 && (i === 0 || i === n - 1) ? 0.5 : 1));
  const cols = {
    stay: splitUnits(totals.stay, stayW),
    food: splitUnits(totals.food, equal),
    transport: splitUnits(totals.transport, transportW),
    experiences: splitUnits(totals.experiences, expW),
    flex: splitUnits(totals.flex, equal),
  };
  const days = equal.map((_, i) => {
    const row = {
      stay: cols.stay[i] / unit,
      food: cols.food[i] / unit,
      transport: cols.transport[i] / unit,
      experiences: cols.experiences[i] / unit,
      flex: cols.flex[i] / unit,
    };
    row.total =
      (cols.stay[i] +
        cols.food[i] +
        cols.transport[i] +
        cols.experiences[i] +
        cols.flex[i]) /
      unit;
    return row;
  });
  return {
    days,
    totals: Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, v / unit]),
    ),
  };
}

// "2026-10-14" + 2 -> "2026-10-16" (UTC arithmetic, no time-zone drift)
export function dayDate(startDate, index) {
  if (!startDate) return "";
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}
