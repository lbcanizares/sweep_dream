# Sweep Dreams - MERN classroom MVP

We clean. You relax.

This functional college-project MVP focuses on busy students and student athletes booking basic dorm cleaning at one proposed campus-area pilot. Built with **MongoDB, Express, React, and Node.js**. It is a working software prototype; cleaner screening, real cleaning visits, and payment collection require a team outside the app.

## Run the classroom demonstration

Install Node.js 20.19+ or 22.12+. Open a terminal in this folder:

```powershell
npm install
npm run build
npm run demo
```

Open http://127.0.0.1:5173. Admin key: `sweep-dreams-class-demo`.

Demo mode starts a real, temporary local MongoDB using mongodb-memory-server. Its first run needs internet to download MongoDB. Bookings remain across browser reloads but **reset when the demo server stops**. Use fictional names, contacts, rooms, and cleaners. The demo server binds to localhost.

## Run with persistent MongoDB

Copy `.env.example` to `.env`. Set `MONGO_URI` to your local MongoDB or Atlas connection string, set a long random `ADMIN_KEY`, then run:

```powershell
npm install
npm run build
npm run dev
```

Your MongoDB service must be running. Keep `.env` private. `npm run dev` serves the built app when `dist` exists, otherwise it runs Vite middleware. Delete `dist` if developing source changes, or rebuild it.

## Demonstrate in 3-5 minutes

1. Click **Get Started**, then open the Basic dorm cleaning card and click **Book Now**. Choose Small dorm (PHP 300), then Continue. The bottom navigation also opens **Book a clean** directly.
2. Choose a date from tomorrow onward and 09:00 (Philippines time). Enter Dwight Demo, demo@example.test, and Campus Pilot Dorm Room 204. Continue.
3. Review the final price and request the clean. Show the Pending reference and save the private access token.
4. Open **Admin**, enter the classroom key, type Demo Cleaner for that request, then Confirm & assign. Explain that screening is manual and this name is fictional.
5. Open **My booking** and refresh to show Confirmed and the cleaner name.
6. Return to Admin, select all four checklist items, and Mark completed.
7. Refresh My booking; submit a rating and comment. Refresh the browser to show the feedback remains in MongoDB.
8. Optional: create another request and cancel it. Try confirming two pending requests at the same date and time; the second confirmation is rejected.

The browser remembers the most recent reference/token in localStorage. To find an older booking, enter its saved reference/token. A token grants access to that booking, so treat it as private. Clear site data on shared computers. There are no customer accounts or password recovery in this MVP.

## Implemented scope

- Three-step basic dorm cleaning request, two proposed room sizes, upfront PHP 300/450 prices.
- Server-side pricing and input/date validation, MongoDB storage, reference and private-token tracking.
- Admin key protection, manual cleaner assignment and confirmation.
- One confirmed booking per date/time slot, enforced by MongoDB's unique partial index.
- Pending/confirmed/completed/cancelled states, cancellation, required completion checklist.
- One 1-5 rating and optional comment after completion, visible to admin.
- Mobile layout, loading states, error messages.

Prototype assumptions: small room <=15 m² at PHP 300; standard room 16-25 m² at PHP 450; approximately one hour; 09:00/11:00/13:00/15:00 slots; one pilot cleaner per slot; cash after service. The proposal specifies a starting price of PHP 300 but not these size tiers or schedules. No automatic notifications are sent. The team contacts customers manually.

## Validation

```powershell
npm test
```

The integration test uses a separate real temporary MongoDB. It checks booking creation, price tampering, malformed date/size rejection, private access, unauthorized admin access, conflicting slots, valid status transitions, required checklist, cancellation, feedback timing/range/duplicates, and MongoDB storage. Browser demonstration evidence is supplied with the activity submission.

## Architecture

React forms -> same-origin Express REST API -> MongoDB `bookings` collection.

Node.js runs Express. MongoDB stores customer contact, dorm room, schedule, server-calculated price, status, assigned cleaner, checklist, and feedback. The API excludes private tokens from admin lists and normal booking reads.

Main routes: `GET /api/config`, `POST /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/cancel`, `POST /api/bookings/:id/feedback`, `GET /api/admin/bookings`, `PATCH /api/admin/bookings/:id`.

## Pilot limitations

This is a localhost classroom prototype, not a public production deployment. Before a real pilot: obtain dorm access approval, screen cleaners, confirm actual rates and labor costs, set up persistent MongoDB, use HTTPS and stronger admin authentication with rate limiting, define privacy/retention procedures, and agree on service/cancellation terms. Cash payment is proposed but not processed or recorded. Size is self-reported. Notifications, accounts, rescheduling, online payments, cleaner marketplace, deep/window/appliance cleaning, subscriptions, and multiple service areas are deferred.

## Mobile design update

The interface follows the supplied Sweep Dreams screenshot: pale lavender backgrounds, purple buttons and broom branding, welcome screen, searchable service cards and category filters, service detail, inline calendar, cash payment review, green confirmation mark, booking timeline, assigned cleaner card, and star review controls. It now adapts to both mobile and desktop. Home and deep-cleaning cards are labelled Coming later; only basic dorm cleaning can be booked in this MVP.

The screenshot also shows login/sign-up, social authentication, add-ons, GCash/card payments, discount codes, messaging, live cleaner ETA, and tips. Those require additional backend/integration work and are not presented as working features here. The existing private booking token and administrator key remain the access methods. The timeline displays actual saved booking states rather than simulated cleaner location or arrival estimates.

Verification after the update: production build passed; mobile browser flow completed welcome -> service detail -> calendar -> request -> admin assignment -> completion checklist -> four-star feedback. Search, month navigation, saved status after refresh, and horizontal overflow were checked in the browser.

## Responsive desktop and mobile revision

- Below 768 px: single-column content; full-width fixed bottom navigation with SVG icons, active-page highlighting, and device safe-area padding. The main content reserves enough bottom space so final actions can scroll above the navigation bar.
- At 768 px and above: branded sticky top navigation, wider page content, a three-column services grid, two-column service details, desktop tracking layout, and four-column administrator statistics. Booking shows a checklist sidebar on larger desktops; tablet widths stack it beneath the form.
- Form fields, cards, calendar, summaries, and buttons resize without horizontal scrolling. The welcome page also uses a desktop layout.
- Keyboard focus styles, a skip-to-content link, labelled navigation, and larger controls are included. This is responsive layout verification, not a formal WCAG conformance audit.

Browser checks covered 320, 390, 768, 1024, and 1440 px. Home, booking, populated tracking, and admin screens had no horizontal overflow or clipped navigation labels. Calendar and review layouts were also checked. At 320 px, the final request button was visibly above the bottom navigation. A booking created at mobile width was confirmed and completed using the desktop admin view, then reviewed at mobile width.


## Latest responsive website revision
See MVP-SCOPE.md for the implemented routes and reference decisions. Navigation supports URL hashes, reload and browser history. Confirmed/completed slots are reserved in MongoDB and schedule availability is checked before review. Navigation, home, service detail and API helpers are separate modules.

The current revised preview runs on http://127.0.0.1:5175 (the earlier preview remains on 5173). To use this preview port yourself in PowerShell:

```powershell
$env:PORT='5175'
npm run demo
```

Administrator key in demo mode: sweep-dreams-class-demo. Temporary demo records reset when the server stops. Persistent MongoDB configuration remains documented above.


## Customer account update
Sign up: #signup. Log in: #login. Customer accounts use email/password; passwords are salted and hashed with Node scrypt. Sessions use a seven-day HttpOnly SameSite cookie and hashed server-side session records. Logout revokes the current session. New bookings made while logged in belong to that account and appear under My booking on other devices after login. Existing guest bookings remain accessible by private reference/token and are not automatically claimed by email.

Authentication validation, wrong password, duplicate email, session logout, account history and cross-account isolation are covered by the integration test. The browser sign-up/login/logout/reload flows passed. Email verification, password recovery and social sign-in are not included. Demo accounts and bookings reset when the server stops; persistent MongoDB keeps them across restarts. Use fictional details for classroom demonstrations.


## Separate login portals
Customer login: #login. Administrator login: #admin-login. Customer/guest navigation has no Admin item. Staff login uses the administrator key and has its own booking-desk navigation. Direct #admin access redirects to staff login until a valid key is supplied. Returning to customer views clears the in-memory staff key; browser refresh requires staff login again. Customer cookies alone do not authorize administrator endpoints.
