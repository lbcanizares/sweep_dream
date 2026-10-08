# Deploy Sweep Dreams on Vercel

The React frontend and Express API now deploy together. vercel.json sends /api requests to api/handler.js. The function reuses its MongoDB connection and requires production environment variables. It never runs temporary demo MongoDB.

1. Create a MongoDB Atlas cluster. Under Database Access create a database user with read/write access to sweep_dreams. Under Network Access allow the deployment's outbound connections using your chosen Atlas/Vercel network configuration. Under Connect > Drivers copy the mongodb+srv connection string, replacing the password placeholder with the database user's password (URL-encode special characters).
2. In Vercel project Settings > Environment Variables set MONGO_URI (Atlas connection string), ADMIN_KEY (a long private random value), and DB_NAME (sweep_dreams). Select Production and Preview as needed. Never prefix these with VITE_. Do not commit credentials.
3. Use the repository root as Root Directory, Vite preset, npm run build, output dist, and Node.js 22.x in Vercel settings.
4. Redeploy the latest main commit after setting the variables. If auto-deployment already started without variables, redeploy again.
5. Open https://YOUR-DOMAIN/api/config. A working deployment displays JSON with prices, slots and checklist. A 503 means missing variables or database connectivity; inspect Vercel runtime logs.
6. Open https://YOUR-DOMAIN/#signup for customers. Open https://YOUR-DOMAIN/#admin-login for staff and enter the ADMIN_KEY you configured, not the local classroom demo key.

Sessions use secure cookies on production HTTPS. Database accounts and bookings persist in Atlas. Email verification/password recovery remain outside this MVP. Deployment has not been verified against your private Atlas/Vercel configuration from this workspace.
