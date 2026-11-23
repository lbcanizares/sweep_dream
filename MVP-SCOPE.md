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
- #admin: protected desk with two tabs: Bookings (assign a screened cleaner from a dropdown, override: finish or cancel any job) and Cleaners (create cleaner accounts, record ID/background screening, activate/deactivate)
- #cleaner: login required, cleaner accounts only; the cleaner's assigned jobs with address, customer contact and payment to collect. The cleaner moves each job one step at a time (on the way, cleaning, completed) and must tick the full checklist to finish. Customers see each step on their My bookings timeline

Signed-in customers see these screens inside an app shell (fixed top bar with account menu, left sidebar on tablet/desktop, slide-in drawer on phones). Guests who open #book, #bookings or #dashboard are sent to #login and returned to that page afterwards.

Four services are bookable (basic dorm cleaning from PHP300 by room size; dorm deep clean, regular home cleaning and move-in/move-out at flat prices), with optional add-ons. The server calculates every price. Confirmation and feedback are states within My bookings. Customers choose cash on service or GCash; card is shown as "Coming soon" and cannot be selected (the server also rejects it). No payment is processed: the team arranges GCash payment manually and no electronic charge is simulated. Booking requires an account; guest private-token access was removed. Social login, live location, chat, tips and payment gateways are deferred. Cleaner screening and visits are manual operations, never claimed to have been performed by the software.

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
