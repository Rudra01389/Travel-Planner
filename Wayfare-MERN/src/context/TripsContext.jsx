import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";
const TripsContext = createContext(null);
export function TripsProvider({ children }) {
  const { user } = useAuth();
  const accountId = user?.id;
  const [trips, setTrips] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setTrips([]);
    setError("");
    setLoading(true);
    if (!accountId) {
      setLoading(false);
      return;
    }
    api("/trips")
      .then((d) => {
        if (active) setTrips(d.trips);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId]);
  async function addTrip(body) {
    const { trip } = await api("/trips", { method: "POST", body });
    setTrips((p) => [trip, ...p]);
    return trip;
  }
  async function mutate(id, suffix, method, body) {
    const { trip } = await api(`/trips/${id}/${suffix}`, { method, body });
    setTrips((p) => p.map((t) => (t.id === id ? trip : t)));
    return trip;
  }
  const value = {
    trips,
    loading,
    error,
    addTrip,
    getTrip: (id) => trips.find((t) => t.id === id),
    addExpense: (id, b) => mutate(id, "expenses", "POST", b),
    editExpense: (id, e, b) => mutate(id, `expenses/${e}`, "PATCH", b),
    removeExpense: (id, e) => mutate(id, `expenses/${e}`, "DELETE"),
    saveItinerary: (id, b) => mutate(id, "itinerary", "PATCH", b),
    savePacking: (id, b) => mutate(id, "packing", "PATCH", b),
    updateBudget: (id, b) => mutate(id, "budget", "PATCH", b),
    reload: async () => {
      const d = await api("/trips");
      setTrips(d.trips);
    },
    deleteTrip: async (id) => {
      await api(`/trips/${id}`, { method: "DELETE" });
      setTrips((p) => p.filter((t) => t.id !== id));
    },
  };
  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
}
export const useTrips = () => useContext(TripsContext);
