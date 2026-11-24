# Responsive Sweep Dreams MVP

## References and choices
The project PDF identifies a busy student athlete, transparent basic cleaning rates from PHP300, a service checklist, and dorm access/trust. The supplied screen image informs the violet palette, service card, calendar, payment review, confirmation, progress timeline and review. The Figma URL could not be read in this session, so pixel-perfect equivalence to its latest file is not claimed.

The business canvas supports booking, manual cleaner matching, customer contact and service fees. Exact pilot sizes/rates remain assumptions. Steve Blank's MVP Tree article supports selecting one customer group, one job and one delivery platform. This implementation serves busy dorm residents through a responsive web platform.

## Implemented routes
- #home: public landing page with the service list (signed-in customers are sent to #dashboard; #start is an alias)
- #detail: the chosen service's inclusions, price and add-ons (public)
- #dashboard: login required; greeting, service search and Dorm/Home filters, promo card and the customer's bookings
- #book: login required; service, room size (basic dorm cleaning), add-ons, calendar/time availability, details and payment method
- #bookings: login required; the account's bookings split into Upcoming (pending/confirmed, soonest first) and History (completed/cancelled, newest first), with receipt, confirmed assignment, status, cancellation and feedback (#track is an alias)
- Calendar reminders: pending and confirmed bookings offer "Add to Google Calendar" (opens Google Calendar with the visit pre-filled in Philippine time, so the customer's own Google reminders apply). No Google account connection or API keys are used, so saved events don't update automatically; cancelled bookings remind the customer to delete the event
- #admin and #admin-cleaners: protected desk in the same sidebar shell customers use (drawer on phones). Bookings: assign a screened cleaner from a dropdown, reassign a confirmed job that hasn't started to another screened cleaner, override: finish or cancel any job. Cleaners: create cleaner accounts, edit their details (name, email, phone, photo link, bio, service types, screening, optional new password that signs them out), and deactivate/reactivate. A cleaner with active jobs (confirmed, on the way or cleaning) can't be deactivated until those jobs are reassigned, finished or cancelled; the server enforces this too
- #cleaner: login required, cleaner accounts only; the cleaner's assigned jobs with address, customer contact and payment to collect. The cleaner moves each job one step at a time (on the way, cleaning, completed) and must tick the full checklist to finish. Customers see each step on their My bookings timeline

Signed-in customers see these screens inside an app shell (fixed top bar with account menu, left sidebar on tablet/desktop, slide-in drawer on phones). Guests who open #book, #bookings or #dashboard are sent to #login and returned to that page afterwards.

Four services are bookable (basic dorm cleaning PHP500 for 1 room + the common area, +PHP150 per extra room; dorm deep clean PHP800, adding bathroom cleaning and a linen change with its own longer cleaner checklist, +PHP250 per extra room or bathroom; regular home cleaning PHP1,500 and move-in/move-out PHP2,500 for up to 2 bedrooms, living room, kitchen and 1 bathroom, +PHP250 per extra bedroom or bathroom, up to 4 bedrooms and 3 bathrooms). Customers add extra areas with counters on the booking form; the server checks each against the service's limits and calculates the total, with optional add-ons. The server calculates every price. Confirmation and feedback are states within My bookings. Customers choose cash on service or GCash; card is shown as "Coming soon" and cannot be selected (the server also rejects it). No payment is processed: the team arranges GCash payment manually and no electronic charge is simulated. Booking requires an account; guest private-token access was removed. Every booking needs a map pin inside Naga City, our service area (Leaflet with OpenStreetMap tiles and credit). "Set pin on map" opens a full-screen map on phones (a pop-up on larger screens) with a fixed centre pin: customers move the map under it, or use "Use my location" or a submit-only address search limited to Naga City (respecting OpenStreetMap's ~1 search per second limit), then confirm. The server rejects pins outside Naga City. The assigned cleaner sees the pin with a Google Maps "Get directions" link; the admin and the customer see it too. This is a one-time pin, not live tracking. Social login, live location tracking, chat, tips and payment gateways are deferred. Cleaner screening and visits are manual operations, never claimed to have been performed by the software.

## Quality checks
Production build and real MongoDB API lifecycle tests. Browser demonstration: booking, assignment, checklist completion, feedback and reload. Navigation uses actual shareable hash routes. Data in demo MongoDB lasts until the server stops; configure .env with persistent MongoDB for saved data between restarts.

## Guide links
https://medium.com/@sgblank/a-path-to-the-minimum-viable-product-d54d5a500baf
https://www.ycombinator.com/library/Io-how-to-build-an-mvp


## Customer account update
Sign up: #signup. Log in: #login. Customer accounts use email/password; passwords are salted and hashed with Node scrypt. Sessions use a seven-day HttpOnly SameSite cookie and hashed server-side session records. Logout revokes the current session. Bookings belong to the account that made them and appear under My bookings on other devices after login.

Authentication validation, wrong password, duplicate email, session logout, account history and cross-account isolation are covered by the integration test. The browser sign-up/login/logout/reload flows passed. Email verification, password recovery and social sign-in are not included. Demo accounts and bookings reset when the server stops; persistent MongoDB keeps them across restarts. Use fictional details for classroom demonstrations.


## Cleaner portal update
Cleaners log in on the same #login page as customers. The account's role decides where they land: customers go to #dashboard, cleaners go to #cleaner, and each is redirected away from the other's pages. The server checks the role on every cleaner route, so the page used to log in doesn't matter. Public sign-up always creates customers; only the admin can create cleaner accounts (users.role = 'cleaner' plus a profile in the cleaners collection: name, phone, photo link, bio, service types, screening checks, active). Only active cleaners with both screening checks can be assigned, and a deactivated cleaner loses portal access immediately. Every status change is recorded in the booking's statusHistory with who made it (customer, admin or cleaner). Photos are stored as links; uploading images is not included.
