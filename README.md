# Wayfare ✈️ — Travel Planner & Expense Tracker

A full-stack travel planning web app: **plan trips, track expenses, and keep every journey's budget under control** — backed by a real Node.js/Express/PostgreSQL backend with **real email verification** (6-digit codes delivered to actual Gmail/Outlook inboxes via the Brevo API).

**Flow:** opening the site shows the **branded landing page** (logo, hero, features) with **Sign in / Get started** at the top right → registration with real email verification → two-way login (password **or** passwordless email code) → trips dashboard → per-trip expense tracking → forgot/reset password — all behind secure, cookie-based sessions. Trips pages are **protected**: signed-out visitors are returned to the landing page.

---

## ✨ Features

### Frontend (React 19 + Vite + react-router 7)

| Area | Details |
|---|---|
| **Landing page** | The site root for visitors: brand logo + sticky header, hero with boarding-pass visual, stats strip, features, how-it-works, security band, footer — with **Sign in / Get started** top right. Signed-in users see their dashboard instead |
| **Registration** | Email + password **plus profile fields**: full name, username, home city/country, preferred currency, short bio |
| **Form validation** | **Live inline validation on every field** of login/register, mirroring the server's zod rules — 🟢 **green outline + "✓ Looks good"** when a field is proper, 🔴 **red outline + exact reason** when not, reacting on every keystroke after first touch. Name/city/country reject digits & symbols **as you type** (letters, spaces, hyphens, apostrophes, periods only — `O'Brien`, `St. Moritz` fine; `Alex99` impossible). Email format, 8–72 char password, username charset (3–20, lowercase/number/`_`), exactly 6 digits for codes; first invalid field auto-focused on submit |
| **Email verification** | Enter the 6-digit code emailed to you (10-minute validity, resend option) |
| **Login** | Two tabs — password (email **or** username) or passwordless emailed sign-in code |
| **Forgot / Reset password** | Emailed reset code → choose a new password |
| **Route protection** | `RequireAuth` guard — trips pages visible only when signed in; post-login redirect back to where you were headed |
| **Trips** | Create trips (destination, dates, travellers, budget), view details, track expenses per trip |
| **Session UI** | Nav bar shows the signed-in user's email + log out |
| **Currency conversion** | 8 display currencies (USD/EUR/GBP/INR/JPY/AUD/CAD/SGD) with **real conversion** via ECB daily reference rates — not just a symbol swap |

### Backend (`server/` — Node.js, Express 5, PostgreSQL)

| Area | Details |
|---|---|
| **REST API** | 11 endpoints under `/api/auth` + `/api/health` |
| **Database** | PostgreSQL with tracked, transactional SQL migrations |
| **Email** | Brevo REST API via built-in `fetch` — no SMTP server, no SDK, no Gmail password; 3 HTML email templates |
| **Sessions** | JWT (7-day) in an `httpOnly`, `SameSite=Lax` cookie — unreadable to JavaScript |
| **Rate limiting** | Per-email (3 codes / 15 min) + per-IP limits on all sensitive endpoints |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, react-router-dom 7, hand-written CSS |
| Backend | Node.js (≥ 20), Express 5 |
| Database | PostgreSQL |
| Auth | bcryptjs (password hashing), jsonwebtoken (JWT sessions), zod (server validation) |
| Client validation | Shared rules mirroring the zod schemas — same limits enforced on both sides (`src/utils/validation.js`) |
| Email | Brevo API (free tier — 300 emails/day, no credit card) |
| Exchange rates | [Frankfurter API](https://frankfurter.dev) (ECB daily reference rates — free, no key) |
| Testing | Custom end-to-end suite (28 live HTTP checks) |
| Linting | oxlint |

---

## 📸 Screens

| Route | What you'll see |
|---|---|
| `/` | **Guests:** branded landing page (logo, hero, Sign in / Get started) · **signed-in users:** dashboard |
| `/landing` | Same landing page (explicit URL) |
| `/register` | Full sign-up form with profile fields, brand top bar |
| `/verify` | 6-digit code entry (autofocused, numeric only) |
| `/login` | Password / Email-code tabs + forgot-password link, brand top bar |
| `/forgot-password`, `/reset-password` | Recovery flow |
| `/trips/new`, `/trips/:id`, `/trips/:id/expenses` | Trip planning (protected — guests are sent back to the landing page) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+** running locally
- A **Brevo** account (free) for real email delivery — see [Brevo setup](#-brevo-setup-free-emails)

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# frontend deps
npm install

# backend deps
cd server
npm install
cd ..
```

### 2. Database

Create the database (psql or pgAdmin):

```sql
CREATE DATABASE wayfare;
```

### 3. Environment variables

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
DATABASE_URL=postgres://postgres:YOUR_PG_PASSWORD@localhost:5432/wayfare
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
BREVO_API_KEY=xkeysib-...          # from Brevo dashboard (see below)
BREVO_SENDER_EMAIL=you@gmail.com   # the address you verified in Brevo
```

> While `BREVO_API_KEY` is empty, the server runs in **dev mode**: codes print to the server console instead of being emailed. Perfect for offline development.

### 4. Migrate & run

```bash
# terminal 1 — backend
cd server
npm run migrate
npm run dev            # → http://localhost:4000

# terminal 2 — frontend
npm run dev            # → http://localhost:5173
```

Open **http://localhost:5173** → you land on the branded home page with **Sign in / Get started** at the top right → Register with a real email → the 6-digit code arrives in that real inbox → verify → you're in the app.

---

## 📧 Brevo Setup (free emails)

1. Create a free account at [app.brevo.com](https://app.brevo.com) — Free plan, 300 emails/day, **no credit card**.
2. **Senders & IP → Senders → Add a sender** — use an address you own. Brevo emails a confirmation link to it; click it (check spam).
3. **SMTP & API → API Keys → Generate new key (v3)** — copy it immediately (shown only once).
4. Put the key + verified sender address into `server/.env`.
5. Smoke-test to a real inbox:

```bash
cd server
npm run send-test-email -- your.real@gmail.com
```

---

## 🔌 API Reference

| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/api/health` | — | Server + email-mode status |
| POST | `/api/auth/register` | `{ email, password, fullName?, username?, homeCity?, homeCountry?, currency?, bio? }` | Creates user, emails verification code. Generic response if the address is already registered |
| POST | `/api/auth/verify-email` | `{ email, code }` | Validates OTP (10 min, single use), marks verified, sets JWT cookie |
| POST | `/api/auth/resend-otp` | `{ email }` | Re-sends code; max 3 / 15 min per address |
| POST | `/api/auth/login` | `{ email, password }` | `email` accepts **email or username**; unverified accounts get a fresh code + `needsVerification` |
| POST | `/api/auth/login-code` | `{ email }` | Passwordless: emails a sign-in code (verified accounts) |
| POST | `/api/auth/verify-login-code` | `{ email, code }` | Exchanges the code for a session |
| POST | `/api/auth/forgot-password` | `{ email }` | Emails a reset code (verified) or verification code (unverified); generic response always |
| POST | `/api/auth/reset-password` | `{ email, code, password }` | Consumes reset code, sets new password |
| POST | `/api/auth/logout` | — | Clears the cookie |
| GET | `/api/auth/me` | — | 🔒 Protected — returns the signed-in user incl. profile |

---

## 🗄 Database Schema

```sql
users                                            email_otps
─────────────────────────────────────            ─────────────────────────────────────
id            uuid PK                            id          uuid PK
email         text UNIQUE NOT NULL               user_id     uuid FK → users ON DELETE CASCADE
password_hash text NOT NULL (bcrypt)             code_hash   text (SHA-256 of code)
is_verified   boolean DEFAULT false              purpose     text ('verify'|'signin'|'reset')
full_name     text                               expires_at  timestamptz (10 min)
username      text UNIQUE (partial idx)          consumed    boolean (single use)
home_city     text                               created_at  timestamptz
home_country  text
currency      text DEFAULT 'USD'
bio           text
created_at    timestamptz
```

---

## 🔒 Security

- **Passwords** — bcrypt (10 rounds, per-hash salt); truncated to bcrypt's 72-byte limit; never stored or logged in plaintext
- **OTP codes** — stored only as SHA-256 hashes; 10-minute expiry; single-use; **purpose-tagged** (a sign-in code can't reset a password)
- **Enumeration resistance** — register / resend / forgot / login-code return identical responses whether or not the email exists; login always runs a bcrypt compare (timing-safe)
- **Input validation** — zod schemas on every request body before any database access, mirrored client-side (`src/utils/validation.js`): live per-field green/red outlines, digits & symbols blocked in name/city/country, 6-digit-only codes — with 46+ rule test cases verified
- **SQL injection** — parameterised queries only (`$1, $2…`)
- **XSS / CSRF** — `httpOnly` cookies (JS can't read them) + `SameSite=Lax`; helmet secure headers
- **Rate limits** — per-email 3/15 min; per-IP register 20, login 10, login-code 10, forgot 10 / 15 min
- **Secrets** — live only in gitignored `server/.env`; the Brevo key never appears in frontend code

---

## 🧪 Testing

The backend ships with an automated end-to-end suite that boots the real server against the real database and makes **28 live HTTP calls**:

```bash
cd server
npm run e2e
```

Covers: registration validation, duplicate-register uniformity, wrong/right verification codes, login by email **and** username, the full sign-in-code flow, the full forgot/reset flow (old password dies, new one works), logout clearing the session, and 429 rate limits. It runs in dev email mode (codes printed to console) so it never consumes the Brevo quota.

```text
Result: 28 passed, 0 failed.
```

---

## 📁 Project Structure

```text
Travel-Planner-main/
├── src/                        # React frontend
│   ├── components/
│   │   ├── Logo.jsx            # Wayfare compass-rose brand logo (SVG)
│   │   ├── NavBar.jsx          # signed-in navigation
│   │   └── RequireAuth.jsx     # route guard
│   ├── context/
│   │   ├── AuthContext.jsx     # signed-in user + auth actions
│   │   └── TripsContext.jsx    # trip/expense state (localStorage for now)
│   ├── pages/
│   │   ├── Landing.jsx         # branded public landing (site root for guests)
│   │   ├── Register.jsx
│   │   ├── VerifyEmail.jsx
│   │   ├── Login.jsx           # password + email-code tabs
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── Dashboard.jsx       # protected
│   │   ├── CreateTrip.jsx      # protected
│   │   ├── TripDetails.jsx     # protected
│   │   └── Expenses.jsx        # protected
│   ├── utils/
│   │   ├── api.js              # fetch wrapper for /api
│   │   └── format.js
│   ├── App.jsx                 # routes: public vs RequireAuth
│   ├── main.jsx
│   └── index.css
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.js            # app bootstrap (helmet, cors, cookies)
│   │   ├── config.js           # env loading
│   │   ├── db.js               # pg pool
│   │   ├── routes/auth.js      # all auth endpoints
│   │   ├── middleware/auth.js  # JWT sign/verify + cookie helpers
│   │   ├── mailer.js           # Brevo REST email
│   │   ├── otp.js              # code generate/hash/consume
│   │   └── rateLimit.js        # per-IP limiter
│   ├── migrations/             # tracked SQL migrations
│   ├── scripts/
│   │   ├── migrate.js
│   │   ├── send-test-email.js
│   │   └── e2e-auth-check.js   # 28-check e2e suite
│   ├── .env.example
│   └── package.json
├── PROJECT_EXPLANATION.md      # detailed write-up (viva/report)
└── package.json
```

---

## 🗺 Roadmap

- [ ] Move trips/expenses from localStorage into Postgres (`user_id`-scoped CRUD API)
- [ ] Dashboard stats endpoint (totals, upcoming trip)
- [ ] Profile edit + change password while signed in
- [ ] Deployment guide (Dockerfile / Render / Railway)

---

## 💱 How currency works

1. **Account currency** — chosen at registration (USD, EUR, GBP, INR, JPY, AUD, CAD, SGD). All amounts you enter or see stored are in this base currency.
2. **Display currency** — the nav-bar dropdown. Pick any of the 8; every budget, breakdown and expense re-renders in it.
3. **Conversion is real** — daily reference rates from the European Central Bank via the free [Frankfurter API](https://frankfurter.dev). The nav tooltip shows the live rate, e.g. *"1 USD = 83.12 INR · ECB 2026-09-12"*.
4. **Smart entry** — if you're viewing in EUR but your account is INR, an expense typed as `50` is converted to INR before saving, and the form tells you so.
5. **Resilience** — rates are cached in the browser for 24 h (ECB updates ~once per banking day). Offline or API down? The last cached table is used and flagged as stale. With no cache at all, the app falls back to your account currency.
6. **INR style** — Indian-rupee accounts keep the lakh formatting ("₹ 3.40 L"); other currencies use k/M compaction ("$ 4.08k").

> Rates are reference rates for planning — actual card/bank rates differ slightly.

---

## 📄 License

MIT — free to use, learn from and build upon.
