import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
export default function NavBar() {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  return (
    <>
      <header className="topnav">
        <Link to="/" aria-label="Wayfare home">
          <Logo />
        </Link>
        <nav aria-label="Main navigation">
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/trips/new">New trip</NavLink>
              <NavLink to="/expenses">Expenses</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              <button
                className="nav-button"
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a className="desktop-link" href="/#how-it-works">
                How it works
              </a>
              <NavLink to="/login">Log in</NavLink>
              <Link className="nav-cta" to="/register">
                Start planning <span>↗</span>
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
