# Wayfare — Travel Planner

**Plan your next escape, keep your budget in view, and make room for the journey.**

Wayfare is a full-stack MERN travel planner with editable itineraries, expense tracking, destination maps, packing checklists, and a responsive light/dark interface. Travel plans and account data are stored in MongoDB.

## Features

- **Accounts:** email verification, login with email or username, optional Google sign-in, password reset, and profile settings.
- **Trip dashboard:** upcoming and past trips, destination summaries, and budgets grouped by currency.
- **Itinerary planning:** starter itineraries, editable daily activities and notes, drag-and-drop reordering, and keyboard-friendly move controls.
- **Maps and places:** city search, nearby recommendations, and walking routes through Geoapify, Leaflet, and OpenStreetMap.
- **Budgets and expenses:** create a trip budget, add/edit/delete expenses, view category totals, and track remaining budget.
- **Multiple currencies:** enter expenses in their original currency and view amounts in a preferred display currency.
- **Packing and reminders:** save a checklist and export a calendar reminder before departure.
- **PDF export:** download a saved itinerary with trip dates, budget, activities, and packing checklist.
- **Light and dark modes:** follows system appearance initially, remembers your selection, and synchronizes theme changes between browser tabs.
- **Responsive UI:** forest-green, blue, lavender, and gold accents, accessible focus states, and support for reduced motion.

Document uploads and friend invitations are no longer included. Existing stored records are preserved; this update does not delete legacy data.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | bcrypt, email OTPs, HttpOnly session cookies, Google OAuth |
| Validation | Zod shared between client and server |
| Maps and search | Leaflet, OpenStreetMap, Geoapify |
| Email | Brevo transactional API or SMTP |
| Exchange rates | Frankfurter |
| Exports | jsPDF, iCalendar (`.ics`) |
| Testing | Node test runner, Supertest, MongoDB Memory Server, Playwright |

## Requirements

- Node.js **22.12 or newer** and npm.
- A MongoDB connection: MongoDB Atlas or a local MongoDB instance.
- Brevo credentials and a verified sender for registration and password-reset emails.
- Optional Google OAuth credentials and a Geoapify API key for those integrations.

## Local setup

### 1. Get the project

```bash
git clone https://github.com/Rudra01389/Travel-Planner.git
cd Travel-Planner
```

Use the folder containing `package.json` as the project root for all commands below. If the repository contains an additional `Wayfare-MERN` folder, open that folder first.

### 2. Install dependencies

```bash
npm ci
```

Install dependencies once in the project root. The frontend and backend share the root dependencies.

### 3. Create the environment file

Copy `.env.example` to `.env` in the project root.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Fill in your actual credentials in `.env`. The following example uses placeholders:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/wayfare
MONGODB_DB_NAME=
OTP_SECRET=replace-with-at-least-32-random-characters
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
NODE_ENV=development
BREVO_SENDER_EMAIL=your-verified-sender@example.com
BREVO_SENDER_NAME=Wayfare
BREVO_API_KEY=your-brevo-api-key
BREVO_SMTP_USER=
BREVO_SMTP_KEY=
TRUST_PROXY=0
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GEOAPIFY_API_KEY=
```

Generate an OTP secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `OTP_SECRET`.

### 4. Start the app

Run the frontend and backend together:

```bash
npm run dev:all
```

Open **http://localhost:5173**. The API uses port **5000** by default, and Vite forwards `/api` requests to the backend.

Alternatively, use two terminals from the project root:

```bash
# Terminal 1: frontend
npm run dev
```

```bash
# Terminal 2: backend with automatic restart
npm run dev:server
```

Choose one startup method at a time. On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Required MongoDB connection string. |
| `MONGODB_DB_NAME` | Optional database override; otherwise the connection string selects the database. |
| `OTP_SECRET` | Required secret of at least 32 characters for hashing verification codes. |
| `CLIENT_ORIGIN` | Exact frontend origin, including its port in development. |
| `PORT` | Backend port; defaults to `5000`. |
| `NODE_ENV` | Use `development` locally and `production` on the deployed server. |
| `BREVO_SENDER_EMAIL` | Required verified sender email. |
| `BREVO_SENDER_NAME` | Sender display name. |
| `BREVO_API_KEY` | Brevo transactional API credential. |
| `BREVO_SMTP_USER`, `BREVO_SMTP_KEY` | SMTP alternative when `BREVO_API_KEY` is empty. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in credentials. |
| `GOOGLE_REDIRECT_URI` | Optional callback override; defaults to `CLIENT_ORIGIN/api/auth/google/callback`. |
| `GEOAPIFY_API_KEY` | Enables city search, nearby recommendations, and routing. |
| `TRUST_PROXY` | Set to `1` only when the server is behind exactly one trusted reverse proxy. |

Keep `.env` private. The included `.gitignore` excludes `.env`, `.env.*`, `node_modules`, and build output, while allowing `.env.example`. Keep real keys out of `.env.example` and never prefix server secrets with `VITE_`.

## Accounts and usernames

1. Register with your name, a unique username, email address, and password.
2. Verify your email using the six-digit code sent through Brevo.
3. Log in using **either your email or username**, along with your password.

Usernames are case-insensitive and contain **3–30 letters, numbers, or underscores**. Existing users can continue signing in with email and add a username in **Profile**.

New passwords require 10–72 characters, uppercase and lowercase letters, and a number, within bcrypt's 72-byte limit. Verification codes expire after 10 minutes, allow five attempts, and can be resent after a 60-second cooldown. Password resets invalidate existing sessions.

Profile settings include name, username, display currency, time zone, and travel preferences.

## Optional integrations

### Google sign-in

Create a Google OAuth client for a web application. Configure the frontend origin and this local callback URI:

```text
http://localhost:5173/api/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart the backend. The Google sign-in button appears when both are configured. Use your production domain for the deployed callback. Google-only accounts can use **Forgot password** to establish a password for email/username login.

### Destination maps and recommendations

Set `GEOAPIFY_API_KEY` and restart the backend. Select a city from the search results when creating a trip to save its coordinates and enable the map.

Nearby places can be added to the itinerary. Save the itinerary before generating a walking route. Routes need at least two activities with coordinates and support up to 10 stops. A manually typed destination without coordinates can still be used for planning.

### Currency conversion

Supported currencies: **INR, USD, EUR, GBP, AED, SGD, JPY, AUD, CAD, CHF, THB, NZD**.

Each trip keeps a base ledger currency. Changing display currency converts the presentation without rewriting saved ledger amounts. Foreign-currency expenses retain their original amount, currency, exchange rate, and rate date.

Frankfurter provides reference rates without an API key. Rates are planning estimates and exclude card/bank fees. If conversion is unavailable, the app reports the failure rather than inventing a rate. A trip budget is the total for the trip, not a per-person amount.

## Exports and reminders

- **PDF:** download the saved itinerary and packing checklist. Use Latin-script text for reliable output with the bundled standard font.
- **Calendar:** export an `.ics` reminder for one day, three days, or one week before departure. Import it into your calendar and enable that calendar's notifications.

Wayfare does not send background reminder emails or push notifications. Starter itineraries and budget allocations are planning guides; confirm prices, routes, opening hours, and availability before booking.

## Project structure

| Path | Contents |
| --- | --- |
| `src/pages/` | Landing, authentication, dashboard, trip creation/details, expenses, and profile screens. |
| `src/components/` | Navigation, theme toggle, itinerary editor, maps, currency picker, and packing tools. |
| `src/context/` | Account and trip state. |
| `src/lib/` | API client, validation, money formatting, PDF/calendar exports. |
| `src/data/` | Starter itinerary generation and planning data. |
| `src/index.css`, `src/refinement.css` | Shared styles, responsive layouts, themes, and accent colors. |
| `server/` | API routes, models, configuration, email delivery, security, and backend tests. |
| `tests/` | Disposable browser-test harness and UI checks. |
| `scripts/` | Development port and cleanup utilities. |
| `public/` | Favicon and theme initialization script. |

## Commands and tests

| Command | Purpose |
| --- | --- |
| `npm run dev:all` | Start frontend and backend together. |
| `npm run dev` | Start the Vite frontend. |
| `npm run dev:server` | Start the backend with automatic restart. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm start` | Start Express; also serves `dist/` when `NODE_ENV=production`. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run the full backend test suite. |
| `npm run test:smoke` | Run configuration, index, and security smoke tests. |
| `npm run test:integration` | Run account and database integration tests. |
| `npm run test:ui` | Build and run the browser flow. |
| `npm run stop:dev` | Stop selected development Node listeners on Windows. |

The updated project passed the production build and **32 automated backend tests**. Tests cover authentication, usernames, OTPs, database compatibility, permissions, expenses, currency conversion, itinerary/checklist conflicts, profiles, passwords, and removed-feature endpoints.

Integration tests use a disposable MongoDB instance. The first run may download the MongoDB binary; no production database or real email is used.

For optional browser checks, first install Chromium:

```bash
npx playwright install chromium
npm run test:ui
```

The browser harness uses a disposable account and fixture integrations. It must not be deployed as the application server. The latest UI refresh has not been visually verified in an automated browser because the browser download failed in the build environment.

## Production

1. Install dependencies with `npm ci` and build with `npm run build`.
2. Set production environment variables, including `NODE_ENV=production` and an HTTPS `CLIENT_ORIGIN` matching the deployed app.
3. Configure MongoDB access, email credentials, and any optional integration credentials.
4. Start with `npm start` on a Node-capable host behind HTTPS.

Express serves the frontend build and `/api` from the same application. GitHub hosts the source code; GitHub Pages alone cannot run the Express backend or MongoDB connection. Configure a shared rate-limit store if deploying multiple backend instances.

The database uses dedicated `wayfare_*` collections. Startup reuses compatible indexes without dropping existing indexes and creates a sparse unique username index, allowing older accounts without usernames to keep working.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Backend cannot start | Confirm required values in the root `.env`, then inspect the startup message. |
| MongoDB connection fails | Check the connection string, database credentials, and Atlas network access if applicable. |
| Verification email does not arrive | Check Brevo credentials, the verified sender, and the recipient's spam folder. |
| Username is unavailable | Choose another username; matching is case-insensitive. |
| Google button is missing | Configure both Google credentials and restart the backend. |
| Google callback fails | Ensure the registered callback matches the configured origin and callback path. |
| Map is unavailable | Select a destination search result with coordinates and configure Geoapify. |
| Port is already in use | Stop the other development process or adjust the configured ports. |
| API requests are rejected | Ensure `CLIENT_ORIGIN` exactly matches the frontend origin. |
| Calendar reminder does not appear | Import the downloaded `.ics` file and enable notifications in the calendar app. |
| PowerShell blocks npm | Run the corresponding command with `npm.cmd`. |
