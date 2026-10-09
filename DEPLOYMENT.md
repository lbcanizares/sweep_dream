# Deploy Sweep Dreams on Vercel

The React frontend (frontend/) and Express API (backend/) deploy together. vercel.json builds the frontend into frontend/dist and sends every /api request to api/index.js, which wraps the Express app from backend/app.js. The function reuses its MongoDB connection and never runs the temporary demo database.

1. Create a MongoDB Atlas cluster and a database user with read/write access to sweep_dreams. Under Network Access, allow connections from anywhere (0.0.0.0/0), because Vercel's outbound IPs change. Copy the mongodb+srv connection string and URL-encode special characters in the password.
2. In Vercel, open Settings > Environment Variables and set MONGO_URI, ADMIN_KEY (a long private value) and DB_NAME (sweep_dreams) for Production and Preview. Never prefix them with VITE_ and never commit them.
3. Import the repository with the repository root as Root Directory. vercel.json already sets the install command, build command and output directory (frontend/dist), so leave the dashboard overrides empty.
4. Redeploy after saving the variables. A deployment that started before they existed will not pick them up.
5. Open https://YOUR-DOMAIN/api/config. It should return JSON with prices, slots and checklist. A 503 means a missing variable or blocked database connection; check the Vercel function logs for the exact error.
6. Customers sign up at https://YOUR-DOMAIN/#signup. Staff sign in at https://YOUR-DOMAIN/#admin-login with the ADMIN_KEY you configured.

Run `npm install` once at the repository root to create package-lock.json, then commit it.
