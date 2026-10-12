import { createContext, useContext, useEffect, useState } from "react";
import { initialTrips, nextId } from "../data/sampleData";

const TripsContext = createContext(null);
const STORAGE_KEY = "wayfare_trips_v1";

export function TripsProvider({ children }) {
  const [trips, setTrips] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : initialTrips;
    } catch {
      return initialTrips;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {
      /* ignore quota errors */
    }
  }, [trips]);

  function addTrip(trip) {
    setTrips((prev) => [trip, ...prev]);
  }

  function getTrip(id) {
    return trips.find((t) => t.id === id);
  }

  function addExpense(tripId, expense) {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, expenses: [{ ...expense, id: nextId("exp") }, ...t.expenses] }
          : t
      )
    );
  }

  function removeExpense(tripId, expenseId) {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) } : t
      )
    );
  }

  function addDocument(tripId, doc) {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, documents: [{ ...doc, id: nextId("doc") }, ...t.documents] }
          : t
      )
    );
  }

  function removeDocument(tripId, docId) {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, documents: t.documents.filter((d) => d.id !== docId) } : t
      )
    );
  }

  const value = { trips, addTrip, getTrip, addExpense, removeExpense, addDocument, removeDocument };

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error("useTrips must be used within TripsProvider");
  return ctx;
}
