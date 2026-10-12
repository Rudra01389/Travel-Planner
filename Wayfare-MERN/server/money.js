import { currency } from "../src/lib/validation.js";
export function scale(code) {
  return (
    10 **
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits
  );
}
export const roundMoney = (amount, code) =>
  Math.round((amount + Number.EPSILON) * scale(code)) / scale(code);
export function shares(amount, code, ids) {
  const units = Math.round(amount * scale(code)),
    q = Math.floor(units / ids.length),
    r = units % ids.length;
  return ids.map((userId, i) => ({
    userId,
    amount: (q + (i < r ? 1 : 0)) / scale(code),
  }));
}
export function balances(expenses, code, members) {
  const values = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const e of expenses) {
    const units = Math.round(e.amount * scale(code));
    values[e.paidBy] = (values[e.paidBy] || 0) + units;
    for (const s of e.shares || [])
      values[s.userId] =
        (values[s.userId] || 0) - Math.round(s.amount * scale(code));
  }
  const debts = Object.entries(values)
      .filter(([, v]) => v < 0)
      .map(([id, v]) => ({ id, v: -v })),
    credits = Object.entries(values)
      .filter(([, v]) => v > 0)
      .map(([id, v]) => ({ id, v })),
    settlements = [];
  let i = 0,
    j = 0;
  while (i < debts.length && j < credits.length) {
    const n = Math.min(debts[i].v, credits[j].v);
    settlements.push({
      from: debts[i].id,
      to: credits[j].id,
      amount: n / scale(code),
    });
    debts[i].v -= n;
    credits[j].v -= n;
    if (!debts[i].v) i++;
    if (!credits[j].v) j++;
  }
  return {
    balances: members.map((m) => ({
      ...m,
      amount: (values[m.id] || 0) / scale(code),
    })),
    settlements,
  };
}
export function createRates(fetcher = fetch) {
  const cache = new Map();
  return async (from, to, at) => {
    currency.parse(from);
    currency.parse(to);
    if (from === to)
      return {
        rate: 1,
        date: at || new Date().toISOString().slice(0, 10),
        source: "Same currency",
      };
    const key = [from, to, at || "latest"].join(":");
    const old = cache.get(key);
    if (old && old.until > Date.now()) return old.value;
    try {
      const url = new URL(`https://api.frankfurter.dev/v2/rate/${from}/${to}`);
      if (at) url.searchParams.set("date", at);
      const res = await fetcher(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw Error("Rates unavailable");
      const data = await res.json();
      if (
        !Number.isFinite(data.rate) ||
        data.rate <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
      )
        throw Error("Invalid exchange rate");
      const value = {
        rate: data.rate,
        date: data.date,
        source: "Frankfurter daily reference rate",
      };
      cache.set(key, { until: Date.now() + 3600000, value });
      if (cache.size > 1000) cache.delete(cache.keys().next().value);
      return value;
    } catch {
      throw Object.assign(
        Error(
          "Exchange rates are unavailable. Try again; no amounts were changed.",
        ),
        { status: 503 },
      );
    }
  };
}
export const getRate = createRates();
