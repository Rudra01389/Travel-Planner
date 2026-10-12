export function formatINR(amount) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatLakh(amount) {
  return `₹ ${(amount / 100000).toFixed(1)} L`;
}

export function formatDateRange(start, end) {
  if (!start || !end) return "Not yet dated";
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: "numeric", month: "long" };
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString("en-GB", sameMonth ? { day: "numeric" } : opts);
  const endStr = e.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export function travellerLabel(n) {
  if (!n || n <= 1) return "Solo";
  return `${n} travellers`;
}
