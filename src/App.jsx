import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import TripDetails from "./pages/TripDetails";
import Expenses from "./pages/Expenses";
import { useTrips } from "./context/TripsContext";

function ExpensesRedirect() {
  const { trips } = useTrips();
  const primary = trips.find((t) => t.status === "upcoming") || trips[0];
  if (primary) return <Navigate to={`/trips/${primary.id}/expenses`} replace />;
  return <Navigate to="/trips/new" replace />;
}

export default function App() {
  return (
    <div className="page">
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trips/new" element={<CreateTrip />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/trips/:id/expenses" element={<Expenses />} />
        <Route path="/expenses" element={<ExpensesRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
