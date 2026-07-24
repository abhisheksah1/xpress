# AGENTS.md

## Cursor Cloud specific instructions

KoseliXpress is a MERN monorepo: an Express REST API (`backend/`, port `5000`) backed by
MongoDB, and a React + Vite + Tailwind SPA (`frontend/`, port `5173`). The Vite dev server
proxies `/api`, `/robots.txt`, and `/sitemap.xml` to the backend, so run both together and
use the frontend origin `http://localhost:5173` in the browser.

Standard run/build commands live in the root and package `package.json` files:
- Both dev servers together: `npm run dev` (root; uses `concurrently`).
- Backend only: `npm run dev --prefix backend` (nodemon, port 5000).
- Frontend only: `npm run dev --prefix frontend` (Vite, port 5173).
- Frontend production build: `npm run build --prefix frontend`.

There is no lint or automated-test tooling in this repo (no ESLint/Prettier config, no
`test`/`lint` scripts). "Lint" and "tests" are not applicable here.

### MongoDB (must be started manually)
- `mongod` (MongoDB 8.0) is installed but there is no systemd in this VM, so it will not
  auto-start. Start it in the background before the backend:
  `mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017`
  (data dir `/data/db` already exists and is owned by the `ubuntu` user).
- The backend exits immediately with `MongoDB connection error` if `mongod` is not running.

### Backend env (`backend/.env`, git-ignored)
- A development `backend/.env` is already present in the VM snapshot. If it is missing,
  recreate it from `backend/.env.example` with `MONGODB_URI=mongodb://127.0.0.1:27017/koselixpress`,
  `NODE_ENV=development`, `PORT=5000`, and long random `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- `NODE_ENV=development` disables rate limiting and enables CORS for localhost origins.
- On startup the backend auto-seeds a super admin + default settings/navbar/homepage/delivery
  (see `backend/src/seeds/superAdmin.seed.js`), so no separate seed step is needed. The dev
  super admin is `admin@koselixpress.com` / `ChangeMe@123`.

### Admin login OTP gotcha
- Admin/staff logins normally require an emailed OTP (device verification). Email (Brevo) is
  not configured in dev, so `backend/.env` sets `ADMIN_LOGIN_SKIP_OTP=true` to bypass the OTP
  for local admin login. Without this flag, `POST /api/v1/auth/login` returns a challenge and,
  since Brevo is unconfigured, the one-time code is only returned as `devOtp` in the JSON
  response (not shown in the UI).
- `nodemon` watches only `js/mjs/cjs/json`, not `.env`. After editing `backend/.env`, restart
  the backend (type `rs` in the nodemon terminal) for changes to take effect.

### Notes
- External NRB forex + payment-reconcile schedulers run on startup; the NRB forex fetch needs
  outbound network and logs a sync line — failures there are non-fatal for local dev.
