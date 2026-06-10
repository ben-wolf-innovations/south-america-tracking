# South America Trip Tracker

A web app for planning and tracking a 6-month South America trip. Built for two access levels: admin (full edit access) and family (read-only view).

## Stack

- **Frontend**: React 18, Vite, Leaflet.js
- **Backend**: Azure Functions v4 (Node.js, ESM)
- **Database**: Turso (libSQL cloud)
- **Auth**: JWT with PIN-based login (two access levels)
- **Hosting**: Azure Static Web Apps (frontend) + Azure Functions (API)

## Pages

**Overview** (admin only)
Trip stats at a glance: current location, days elapsed, budget vs actual spend broken down by category and country.

**Map**
Interactive Leaflet map showing all planned locations as markers with a route polyline. Markers are colour-coded by status (visited, current, planned). Supports check-in directly from the map.

**Locations**
Full CRUD for trip stops. Each location stores accommodation, food, activities and travel costs (planned and actual), plus nights, dates, and booking status. Locations are sequence-ordered and support drag-to-reorder and insertion at any point in the sequence.

**Costs**
Log individual expenses against a location and category. The summary view shows planned vs actual spend by category and by country.

**Packing List**
Track items to pack with a budget and actual cost per item. Filtered by owner (Ben, Elspeth, Both) and category. Shows totals and difference.

**Blog**
Travel journal with publish/draft toggle. Admin can write and publish posts; family sees published posts only.

**Useful Info**
Live GBP exchange rates (30-minute cache) for all trip currencies, plus per-country payment info, emergency contacts, time zones, visa info, tipping customs, power plugs, and connectivity notes.

## Access Levels

Two PIN-based roles:

- **Admin**: full read/write access to all pages
- **Family**: read-only access to Overview, Map, Blog, and Useful Info

Tokens are JWTs signed with `JWT_SECRET` and expire after 7 days.

## Local Development

### Prerequisites

- Node.js v18+
- A Turso database (get credentials from `turso db show` and `turso db tokens create`)

### Setup

1. Install dependencies

   ```
   cd api && npm install
   cd ../client && npm install
   ```

2. Configure the API

   Copy `api/local.settings.json.example` to `api/local.settings.json` and fill in:

   ```json
   {
     "Values": {
       "TURSO_DATABASE_URL": "libsql://your-db.turso.io",
       "TURSO_AUTH_TOKEN": "your-token",
       "JWT_SECRET": "a-strong-secret"
     }
   }
   ```

3. Start the API

   ```
   cd api && npm start
   ```

   Runs on `http://localhost:7071/api`

4. Start the frontend

   ```
   cd client && npm run dev
   ```

   Runs on `http://localhost:5173`

## Project Structure

```
api/src/
  functions/    route handlers (HTTP only, no logic)
  services/     business logic and database queries
  shared/       turso.js, auth.js, errors.js
  scripts/      one-off migration scripts

client/src/
  pages/        one file per page
  components/   shared UI components
  context/      AuthContext
  config/       API base URL config
```

## Deployment

The frontend deploys to Azure Static Web Apps via GitHub Actions on push to `main`. The API deploys as an Azure Functions app. Both are configured in the Azure portal.

Environment variables for the deployed API are set in the Azure Functions app settings (equivalent to `local.settings.json` in production).

## Trip

38 stops across Peru, Ecuador, Bolivia, Chile, and Argentina. Starts November 2026.
