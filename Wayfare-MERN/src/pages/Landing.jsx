import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function Landing() {
  const { user } = useAuth();
  const cta = user ? "/dashboard" : "/register";
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            A little less planning. A lot more living.
          </span>
          <h1>
            Go somewhere.
            <br />
            Feel <em>everything.</em>
          </h1>
          <p>
            A long weekend. A faraway city. A trip you’ve talked about for
            years. Bring your plans, budget, and travel essentials together with
            Wayfare.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to={cta}>
              Plan your next escape <span>↗</span>
            </Link>
            <a href="#how-it-works" className="text-link">
              Find your way ↓
            </a>
          </div>
          <div className="hero-footnote">
            <span className="tiny-compass">✳</span> Thoughtfully planned.
            Wonderfully unhurried.
          </div>
        </div>
        <div
          className="travel-art"
          role="img"
          aria-label="Illustrated Mediterranean coastline with terracotta houses, mountains and a winding coastal path"
        >
          <svg viewBox="0 0 520 600" aria-hidden="true">
            <defs>
              <linearGradient id="sky" x2="0" y2="1">
                <stop stopColor="#dddcc9" />
                <stop offset="1" stopColor="#f3dfc1" />
              </linearGradient>
              <linearGradient id="sea" x2="1" y2="1">
                <stop stopColor="#93b3aa" />
                <stop offset="1" stopColor="#355e6d" />
              </linearGradient>
            </defs>
            <rect width="520" height="600" fill="url(#sky)" />
            <circle cx="366" cy="119" r="53" fill="#f2bc7e" />
            <path
              d="M0 259 90 165 160 260 238 204 338 323 520 281V600H0Z"
              fill="#aab3a0"
            />
            <path d="M0 314Q260 261 520 301V600H0Z" fill="url(#sea)" />
            <path d="M0 245Q189 295 217 388T330 600H0Z" fill="#cab793" />
            <path
              d="M0 291Q150 304 167 414T236 600"
              fill="none"
              stroke="#f3e8cf"
              strokeWidth="24"
            />
            <path
              d="M0 296Q77 337 96 440T151 600"
              fill="none"
              stroke="#9f9d78"
              strokeWidth="44"
            />
            {[
              [18, 265, 45, 55],
              [73, 283, 48, 62],
              [119, 324, 44, 60],
              [24, 351, 48, 57],
              [158, 397, 45, 67],
              [186, 481, 45, 69],
            ].map(([x, y, w, h], i) => (
              <g key={x + "-" + y}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={i % 2 ? "#ead5b0" : "#e8b494"}
                />
                <path
                  d={`M${x - 5} ${y}l${w / 2 + 5} -17 ${w / 2 + 5} 17Z`}
                  fill="#ab654c"
                />
                <rect
                  x={x + 12}
                  y={y + 15}
                  width="10"
                  height="17"
                  fill="#405c5e"
                />
                <rect
                  x={x + 26}
                  y={y + 36}
                  width="11"
                  height="19"
                  fill="#405c5e"
                />
              </g>
            ))}
            <path d="m359 365 21-47v47Z" fill="#faf3df" />
            <path d="m384 334 19 31h-19Z" fill="#e7b394" />
            <path d="M351 370h61l-13 10h-35Z" fill="#263548" />
            <path
              d="M292 431q35 8 73 0m-44 9q40 8 68 0m21 80q39 8 81 0"
              stroke="#c4d0b9"
              strokeWidth="2"
              fill="none"
              opacity=".6"
            />
          </svg>
          <div className="art-label">
            <span>THE ART OF GETTING AWAY</span>
            <strong>Take the scenic route.</strong>
            <span>40°37′43″N &nbsp; 14°29′09″E</span>
          </div>
          <span className="art-stamp">
            W<br />
            <small>GO SLOW</small>
          </span>
        </div>
      </section>
      <div className="landing-strip">
        <span>One home for every journey</span>
        <span>01 / Itineraries</span>
        <span>02 / Expenses</span>
        <span>03 / Documents</span>
      </div>
      <section id="how-it-works" className="landing-section">
        <div className="section-intro">
          <span className="eyebrow">Less scattered. More settled.</span>
          <h2>
            Every detail in its place.
            <br />
            Room for the unexpected.
          </h2>
          <p>
            From the first “what if” to the last train home, keep the practical
            things close and the possibilities open.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              "01",
              "Make room to wander",
              "Choose your destination, dates, and pace. Start with a simple itinerary you can use as a planning guide.",
            ],
            [
              "02",
              "Know where it goes",
              "Set a budget in rupees and track what you spend on stays, food, transport, and experiences.",
            ],
            [
              "03",
              "Keep the essentials close",
              "Save tickets and booking documents with your trip, ready when you need them.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <span className="feature-number">{n} ↗</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-final">
        <span className="eyebrow">Your next chapter starts somewhere</span>
        <h2>Where will you go next?</h2>
        <p>Put a little possibility on the calendar.</p>
        <Link className="btn btn-primary" to={cta}>
          Let’s make a plan <span>↗</span>
        </Link>
      </section>
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Wayfare</span>
        <span>For the journey, and everything in between.</span>
        <Link to={user ? "/dashboard" : "/login"}>
          {user ? "Your dashboard" : "Your account"} ↗
        </Link>
      </footer>
    </main>
  );
}
