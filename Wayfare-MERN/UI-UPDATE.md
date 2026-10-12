# Wayfare visual refresh

Refined forest-green and warm neutral palettes, typography, navigation, cards, forms, tables, landing artwork framing, and responsive spacing throughout the app.

The header now includes an accessible light/dark toggle. It uses system appearance by default and remembers explicit choices locally, with synchronization between tabs. The theme is applied before first paint using a same-origin script compatible with the existing content security policy. Storage-disabled browsers can still switch for the current visit.

Dark styling covers authentication, dashboard, itinerary editor, travel tools, expenses, and profile. Map imagery retains its original geographic colors. Keyboard focus and reduced-motion preferences are supported.

Existing routes, APIs, database models, authentication, trip logic, and dependencies are unchanged. Start and build commands remain the same as in README.md.

Validation: production build passed; 12 existing smoke tests passed; six theme initialization checks passed. Lint completed with pre-existing warnings. Visual browser validation could not be completed because the browser download was unavailable in the build environment.
