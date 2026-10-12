# Wayfare — MERN travel planner

React/Vite frontend, Express backend, MongoDB storage, and Brevo email verification.

## Updating your project

This update changes frontend, backend, and dependencies. Extract the ZIP into a new folder. Copy **only your existing root `.env`** into the new `Wayfare-MERN` folder. Keep the new `package.json`, `package-lock.json`, and all other files.

From the new project root, run:

```bash
npm.cmd install
```

Start two terminals:

```bash
# Terminal 1 — project root: frontend
npm.cmd run dev
```

```bash
# Terminal 2 — project root: backend
cd server
npm.cmd start
```

Open the frontend address printed by Vite. `CLIENT_ORIGIN` in `.env` must match that address (usually `http://localhost:5173`). `PORT=5000` is the backend port. Do not start another backend from the root while the server terminal is running. On macOS/Linux use `npm` instead of `npm.cmd`.

For a single terminal you can instead run `npm.cmd run dev:all` from the root. Stop the separate terminals first. `npm.cmd run stop:dev` clears leftover Node listeners on configured ports on Windows; run it before starting the app.

Node 22.12+ is required (Node 24 recommended). Install dependencies once in the root; the server shares them.

## Existing environment

Keep your MongoDB URI/database, Brevo key and verified sender, `OTP_SECRET`, `CLIENT_ORIGIN`, `PORT`, and `NODE_ENV`. `.env.example` documents the expected names. `OTP_SECRET` must contain at least 32 random characters. Never put server secrets into `VITE_*` variables.

The database uses dedicated `wayfare_*` collections so older unrelated validators do not reject new accounts. Existing generic collections are untouched. Equivalent existing indexes are reused without dropping indexes. Accounts already stored in `wayfare_users` continue to work.

## New credentials for live features

Add these to your root `.env`:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEOAPIFY_API_KEY=
```

### Google login

1. In Google Cloud Console configure the OAuth consent screen and create an OAuth client of type **Web application**.
2. Add your exact frontend origin, such as `http://localhost:5173`.
3. Add the authorized redirect URI **`http://localhost:5173/api/auth/google/callback`**. Use your actual frontend port; the Vite proxy forwards the callback to Express.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Restart the backend. The Google button appears when both are configured. Add test users if your consent screen is in testing mode.
5. In production use your HTTPS domain for origin and redirect. Optional `GOOGLE_REDIRECT_URI` overrides the automatically derived callback URI.

Google sign-in uses a server-side authorization-code exchange, verified ID-token signature/audience/expiry, random state and nonce, and HttpOnly cookies. Gmail and verified Workspace identities can sign in. For other Google email domains use email registration/verification. Existing password accounts with a matching authoritative Google email can sign in through Google. Google-only accounts can set a password through Forgot password.

### Destination search, recommendations, maps, and routes

Create a Geoapify key and set `GEOAPIFY_API_KEY` on the server. City autocomplete, nearby attractions/restaurants/parks/entertainment, and walking routes use real API responses. The key stays on the server. Choose a city search result when creating a trip to save its coordinates. Manually typed destinations work but do not enable the map.

Add nearby places to a day in the itinerary editor, **save the itinerary**, then click that day’s route button. Routes need at least two activities with coordinates and support up to 10 stops. OpenStreetMap tiles show attribution and are intended for normal interactive use; review their usage policy before a large deployment. Search and route failures show an error rather than invented results. This is a planning tool, not a booking engine. Check hours and availability yourself.

Provider documentation:
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
- https://apidocs.geoapify.com/docs/places/
- https://apidocs.geoapify.com/docs/routing/
- https://operations.osmfoundation.org/policies/tiles/

## Currency and budgets

Supported currencies: INR, USD, EUR, GBP, AED, SGD, JPY, AUD, CAD, CHF, THB, NZD.

- Changing the **budget currency while creating a trip converts the numeric budget** using a fetched reference rate.
- A trip keeps one base ledger currency. Its budget is the **total for the whole group**, not a per-person amount.
- Changing **display currency** converts budget, category totals, expenses, and suggested settlement amounts. It does not rewrite the ledger.
- Each expense can be entered in the currency actually paid. On save, the server converts it to the trip’s base currency and retains the original amount/currency, rate, and rate date. Past expense dates use historical reference rates; future dates use the latest rate. Editing an expense recalculates its rate and split.
- Daily reference rates come from Frankfurter and are cached for one hour. There is no key requirement. Rates are estimates for planning, not bank/card settlement quotes; fees are excluded. Rate dates are shown. If the service is unavailable, saving a foreign-currency expense fails without altering amounts; display falls back to explicitly labelled base-currency amounts.
- Positive amounts and currency decimal precision are validated. JPY has no fractional units. Remaining budget and overspending update when expenses are added, edited, or removed.
- Dashboard totals are grouped by currency; different currencies are never added without conversion.
- Budget category allocations are starter planning allocations, not independently sourced destination price estimates.

Rates documentation: https://frankfurter.dev/

## Accounts and validation

- Registration verifies email with a Brevo six-digit OTP before creating the account.
- Login uses email and password only.
- Forgot password uses an emailed OTP, then invalidates all existing sessions.
- OTPs last 10 minutes, permit five attempts, are single-use, and resending replaces the prior code after a 60-second cooldown. The UI displays the resend countdown.
- New passwords require 10–72 characters, uppercase, lowercase, and a number, within bcrypt’s 72-byte limit. Confirmation is checked in the UI. Existing passwords can still log in without the new complexity rule.
- Shared client/server validation handles email, name, password, OTP, dates, traveller counts, budgets, preferences, coordinates, and expense splits. New trips cannot start before today in the submitted valid time zone. End dates cannot precede start dates and must be within 60 days. Trips include both start and end day.
- Cookies are HttpOnly/SameSite, secure in production. Server stores only hashes of session tokens and OTPs. Mutation requests check the configured Origin. Rate limiting restricts authentication and API attempts.
- Profile supports name, preferred display currency, time zone, and travel preferences. Changing a password requires the current password and signs other devices out.
- Account deletion requires `DELETE` plus the current password. Google-only users need a recent sign-in. Deletion removes the user’s sessions and owned trips/documents; other owners must remove expenses involving that user first. The UI explains the permanent effect.

## Itineraries, collaboration, and reminders

- Add/edit/remove activities and notes. Drag activities within or between days; keyboard-friendly move-up/down and previous/next-day controls provide the same functionality.
- Saving is explicit. Revision checks reject stale itinerary/checklist edits instead of overwriting another person’s changes. Refresh shared trips to see others’ updates.
- Invite friends by email. Invitations appear in their dashboard after they sign in/register with the invited email; **no invitation email is sent**. Accepted members can edit itinerary/checklist/expenses/documents. Owner alone controls budget, members, invitations, and trip/account-owned deletion. Unaccepted invitations give no trip/document access.
- Expenses support a selected payer and equal splitting among accepted members. Currency minor units are distributed exactly, including remainders. Suggested transfers show who owes whom; **no payment processing or settlement recording is included**.
- Packing checklist persists to MongoDB. Dashboard highlights trips starting soon.
- Download an `.ics` calendar reminder for one day, three days, or one week before departure. **Import it into your calendar and enable that calendar’s notifications**. Wayfare does not send background push/email reminders.
- Download an itinerary PDF with dates, budget, saved activities, and packing checklist. The bundled standard PDF font handles Latin text; use Latin-script itinerary text for reliable PDF rendering.
- Responsive forms, accessible labels/focus states, loading messages, empty states, success messages, and errors are included. Tables scroll on small screens.

## Documents

PDF, PNG, or JPEG, at most 2 MB, with size/MIME/signature checks. Files are stored separately in MongoDB and served only to trip members as attachments. Malware scanning is not included. Documents are shared with all accepted members of that trip.

## Build, tests, production

```bash
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

Tests use a real disposable MongoDB 7.0.24 process; the first run downloads its binary. No production database or real email is used. Tests cover auth/OTP/cooldowns, legacy collection compatibility, startup, live-provider adapters with fixtures, exact splits, permissions, converted expenses, edits, document access, conflict protection, profiles, passwords, and deletion. A separate live INR/USD request was checked successfully during development. Live Google and Geoapify need your new credentials and are not claimed as verified against your accounts.

For production set `NODE_ENV=production`, an HTTPS `CLIENT_ORIGIN`, all secrets, and run `npm.cmd start` from the root after building. Express serves `dist` and API together. Use a Node host with MongoDB access and HTTPS. The rate-limit store is process-local; configure a shared store for multiple backend instances.

Source archive excludes `.env`, `node_modules`, and build output. Unexpected API failures log safe route/operation/error details without request bodies or credentials.

## Browser verification

A Chromium browser flow passed: actual budget-number conversion, invalid-budget form rejection, saved itinerary changes, recommendations, saved packing checklist, PDF/calendar downloads, expense entry and display conversion, profile saving, and mobile-width checks. No JavaScript runtime errors were observed. Browser checks use a disposable database and fixture rates/places, not your credentials.

To run it yourself (optional):

```bash
npx playwright install chromium
npm.cmd run test:ui
```

The preview harness in `tests/browser-preview.mjs` automatically signs in a disposable test user. It is used only by UI tests, never by `start` or `dev`, and must never be deployed as your server.
