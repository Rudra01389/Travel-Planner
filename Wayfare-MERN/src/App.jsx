import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
const TripDetails = lazy(() => import("./pages/TripDetails"));
import Profile from "./pages/Profile";
import Expenses from "./pages/Expenses";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { useTrips } from "./context/TripsContext";
import { useAuth } from "./context/AuthContext";
function Protected() {
  const { user, loading, error, refresh } = useAuth();
  const trips = useTrips();
  if (loading)
    return (
      <p className="content" role="status">
        Opening your account…
      </p>
    );
  if (error)
    return (
      <div className="content">
        <p role="alert">{error}</p>
        <button className="btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (trips.loading)
    return (
      <p className="content" role="status">
        Loading your trips…
      </p>
    );
  if (trips.error)
    return (
      <div className="content">
        <p role="alert">{trips.error}</p>
        <button className="btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  return <Outlet />;
}
function ExpensesRedirect() {
  const { trips } = useTrips();
  return (
    <Navigate
      to={trips[0] ? `/trips/${trips[0].id}/expenses` : "/trips/new"}
      replace
    />
  );
}
export default function App() {
  return (
    <div className="page">
      <NavBar />
      <Suspense
        fallback={
          <p className="content" role="status">
            Loading page…
          </p>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth key="login" mode="login" />} />
          <Route
            path="/register"
            element={<Auth key="register" mode="register" />}
          />
          <Route
            path="/forgot-password"
            element={<Auth key="forgot" mode="forgot" />}
          />
          <Route element={<Protected />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trips/new" element={<CreateTrip />} />
            <Route path="/trips/:id" element={<TripDetails />} />
            <Route path="/trips/:id/expenses" element={<Expenses />} />
            <Route path="/expenses" element={<ExpensesRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
