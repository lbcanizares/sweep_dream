# Responsive Sweep Dreams MVP

## References and choices
The project PDF identifies a busy student athlete, transparent basic cleaning rates from PHP300, a service checklist, and dorm access/trust. The supplied screen image informs the violet palette, service card, calendar, payment review, confirmation, progress timeline and review. The Figma URL could not be read in this session, so pixel-perfect equivalence to its latest file is not claimed.

The business canvas supports booking, manual cleaner matching, customer contact and service fees. Exact pilot sizes/rates remain assumptions. Steve Blank's MVP Tree article supports selecting one customer group, one job and one delivery platform. This implementation serves busy dorm residents through a responsive web platform.

## Implemented routes
- #home: public landing page with the service list (signed-in customers are sent to #dashboard; #start is an alias)
- #detail: the chosen service's inclusions, price and add-ons (public)
- #dashboard: login required; greeting, service search and Dorm/Home filters, promo card and the customer's bookings
- #book: login required; service, room size (basic dorm cleaning), add-ons, calendar/time availability, details and payment method
- #bookings: login required; the account's bookings with receipt, confirmed assignment, status, cancellation and feedback (#track is an alias)
- #admin: protected desk, assignment and mandatory completion checklist

Signed-in customers see these screens inside an app shell (fixed top bar with account menu, left sidebar on tablet/desktop, slide-in drawer on phones). Guests who open #book, #bookings or #dashboard are sent to #login and returned to that page afterwards.

Four services are bookable (basic dorm cleaning from PHP300 by room size; dorm deep clean, regular home cleaning and move-in/move-out at flat prices), with optional add-ons. The server calculates every price. Confirmation and feedback are states within My bookings. Customers choose cash on service, GCash or card, but no payment is processed: the team arranges GCash/card payment manually and no electronic charge is simulated. Booking requires an account; guest private-token access was removed. Social login, live location, chat, tips and payment gateways are deferred. Cleaner screening and visits are manual operations, never claimed to have been performed by the software.

## Quality checks
Production build and real MongoDB API lifecycle tests. Browser demonstration: booking, assignment, checklist completion, feedback and reload. Navigation uses actual shareable hash routes. Data in demo MongoDB lasts until the server stops; configure .env with persistent MongoDB for saved data between restarts.

## Guide links
https://medium.com/@sgblank/a-path-to-the-minimum-viable-product-d54d5a500baf
https://www.ycombinator.com/library/Io-how-to-build-an-mvp


## Customer account update
Sign up: #signup. Log in: #login. Customer accounts use email/password; passwords are salted and hashed with Node scrypt. Sessions use a seven-day HttpOnly SameSite cookie and hashed server-side session records. Logout revokes the current session. Bookings belong to the account that made them and appear under My bookings on other devices after login.

Authentication validation, wrong password, duplicate email, session logout, account history and cross-account isolation are covered by the integration test. The browser sign-up/login/logout/reload flows passed. Email verification, password recovery and social sign-in are not included. Demo accounts and bookings reset when the server stops; persistent MongoDB keeps them across restarts. Use fictional details for classroom demonstrations.
