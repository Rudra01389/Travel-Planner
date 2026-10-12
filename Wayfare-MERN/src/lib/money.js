import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "../context/AuthContext";
const pending = new Map();
export function rate(from, to) {
  const key = `${from}:${to}`;
  const old = pending.get(key);
  if (old && old.until > Date.now()) return old.promise;
  const promise = api(`/currencies/rate?from=${from}&to=${to}`).catch((e) => {
    pending.delete(key);
    throw e;
  });
  pending.set(key, { promise, until: Date.now() + 3600000 });
  return promise;
}
export function money(amount, currency = "INR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits,
  }).format(Number(amount) || 0);
}
export function useMoney(base = "INR") {
  const { user } = useAuth();
  const [display, setDisplay] = useState(user?.currency || base),
    [quote, setQuote] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setQuote(null);
    setError("");
    if (base === display) {
      setQuote({ rate: 1, source: "Same currency" });
      return;
    }
    rate(base, display)
      .then((q) => {
        if (active) setQuote(q);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, display]);
  return {
    display,
    setDisplay,
    quote,
    error,
    format: (n) =>
      money(quote ? Number(n) * quote.rate : n, quote ? display : base),
    actual: quote ? display : base,
    loading: !quote && !error,
  };
}
