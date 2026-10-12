import { NavLink } from "react-router-dom";
import { useTrips } from "../context/TripsContext";

export default function NavBar() {
  const { trips } = useTrips();
  const primaryTrip = trips.find((t) => t.status === "upcoming") || trips[0];
  const expensesHref = primaryTrip ? `/trips/${primaryTrip.id}/expenses` : "/trips/new";

  return (
    <header className="topnav">
      <NavLink to="/" className="logo">
        Wayfare
      </NavLink>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/trips/new" className={({ isActive }) => (isActive ? "active" : "")}>
          Trips
        </NavLink>
        <NavLink to={expensesHref} className={({ isActive }) => (isActive ? "active" : "")}>
          Expenses
        </NavLink>
      </nav>
    </header>
  );
}
