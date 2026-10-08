# Responsive Sweep Dreams MVP

## References and choices
The project PDF identifies a busy student athlete, transparent basic cleaning rates from PHP300, a service checklist, and dorm access/trust. The supplied screen image informs the violet palette, service card, calendar, payment review, confirmation, progress timeline and review. The Figma URL could not be read in this session, so pixel-perfect equivalence to its latest file is not claimed.

The business canvas supports booking, manual cleaner matching, customer contact and service fees. Exact pilot sizes/rates remain assumptions. Steve Blank's MVP Tree article supports selecting one customer group, one job and one delivery platform. This implementation serves busy dorm residents through a responsive web platform.

## Implemented routes
- #start: optional welcome screen
- #home: search and service discovery
- #detail: basic cleaning, inclusions and rates
- #book: room size, calendar/time availability, details and cash payment review
- #track: request receipt, confirmed assignment, saved status, cancellation and feedback
- #admin: protected desk, assignment and mandatory completion checklist

Confirmation and feedback are states within My booking. Cash is paid manually after service; no electronic charge is simulated. No login is necessary: customers use a private booking token. Account/social login, live location, chat, tips, add-ons and payment gateways are deferred. Cleaner screening and visits are manual operations, never claimed to have been performed by the software.

## Quality checks
Production build and real MongoDB API lifecycle tests. Browser demonstration: booking, assignment, checklist completion, feedback and reload. Desktop top navigation and mobile bottom navigation use actual shareable hash routes. Data in demo MongoDB lasts until the server stops; configure .env with persistent MongoDB for saved data between restarts.

## Guide links
https://medium.com/@sgblank/a-path-to-the-minimum-viable-product-d54d5a500baf
https://www.ycombinator.com/library/Io-how-to-build-an-mvp


## Customer account update
Sign up: #signup. Log in: #login. Customer accounts use email/password; passwords are salted and hashed with Node scrypt. Sessions use a seven-day HttpOnly SameSite cookie and hashed server-side session records. Logout revokes the current session. New bookings made while logged in belong to that account and appear under My booking on other devices after login. Existing guest bookings remain accessible by private reference/token and are not automatically claimed by email.

Authentication validation, wrong password, duplicate email, session logout, account history and cross-account isolation are covered by the integration test. The browser sign-up/login/logout/reload flows passed. Email verification, password recovery and social sign-in are not included. Demo accounts and bookings reset when the server stops; persistent MongoDB keeps them across restarts. Use fictional details for classroom demonstrations.
