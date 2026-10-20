# South America Trip Tracker

A web app for planning and tracking a 6-month South America trip. Built for two access levels: admin (full edit access) and family (read-only view).

## Stack

- **Frontend**: React 18, Vite, Leaflet.js (Esri World Street Map tiles)
- **Backend**: Azure Functions v4 (Node.js, ESM)
- **Database**: Turso (libSQL cloud)
- **Auth**: JWT with PIN-based login (two access levels)
- **Hosting**: Azure Static Web Apps (frontend) + Azure Functions (API)

## Pages

**Overview** (admin only)
Trip stats at a glance: current location, days elapsed, budget vs actual spend broken down by category and country.

**Map**
Interactive Leaflet map showing all planned locations as markers with a route polyline. Markers are colour-coded by status (visited, current, planned). Supports check-in directly from the map.

Checking in stamps the arrival and departure dates from the estimator, but only where they are blank. Each stamp is recorded in `arrival_from_checkin` / `departure_from_checkin`, so "Clear All Visited" and "Undo Last Check-In" remove only the dates a check-in added and leave dates you booked and entered by hand. Editing a date by hand clears its flag, making it yours again.

**Locations**
Full CRUD for trip stops. Supports check-in from the stop's card, same as the map: only the next stop in sequence offers the button, and the result is shown as an inline banner. Cards carry a Visited or Current badge. Each location stores accommodation, food, activities and travel costs (planned and actual), plus nights, dates, and booking status. Locations are sequence-ordered and support drag-to-reorder and insertion at any point in the sequence.

**Itinerary**
A plain read-only list of every stop in order: dates, nights, accommodation, activities and notes. No travel or cost detail. Built for family, but visible to both roles. Overnight travel stops are shown in sequence and marked as such. Admins also see a short planning summary on each stop (anything with a time, anything not booked, and added tours) with a link to that stop in Planning.

**Planning** (admin only)
A day-by-day timeline of where we need to be when. Check-ins, check-outs and transport are built from Locations, so dates always match the stops:

- Check-in and check-out for each stop with nights, on its arrival and departure dates (actual, or estimated and marked "est. date").
- Transport for each stop with a travel method. The method is how we get to that stop, so the entry is dated the day we leave the previous real stop, which puts overnight buses on the day they depart.
- Tours and other entries are added by hand, optionally linked to a stop like costs are. Deleting a stop deletes its plans.

Editing a stop-based entry saves its times, booked flag and booking ref on the stop (`checkin_time`, `checkout_time`, `transport_depart_time`, `transport_arrive_time`); dates are changed in Locations. Times are local to the destination, stored as `HH:MM` with no timezone conversion. Filter by type, stop, not booked and past days.

**To do** (admin only)
One shared list. Each item has a title and one notes field, can be edited or deleted, and moves to a collapsible Done section when ticked.

**Costs**
Log individual expenses against a location and category. Filter by location/category and sort by cost or date. The summary view shows planned vs actual spend by category and by country (the Other category is actual-only, as it has no budget).

**Packing List**
Track items to pack with a budget and actual cost per item. Filtered by owner (Ben, Elspeth, Both), category, and a "Still to get" toggle for unchecked items. Shows totals and difference.

**Blog**
Travel journal with publish/draft toggle. Admin can write and publish posts; family sees published posts only. Both roles can comment (family on published posts only); only admin can delete comments.

**Useful Info**
Live GBP exchange rates (30-minute cache) for all trip currencies, plus per-country payment info, emergency contacts, time zones, visa info, tipping customs, power plugs, and connectivity notes.

## Access Levels

Two PIN-based roles:

- **Admin**: full read/write access to all pages, including Planning and To do
- **Family**: read-only access to Overview, Map, Itinerary, Blog, and Useful Info

The Itinerary page omits cost data in its own UI, but `GET /locations` still returns cost columns to any signed-in role, so this is presentation, not a privacy boundary. Family already sees full budget figures on Overview.

Tokens are JWTs signed with `JWT_SECRET` and expire after 7 days. The API refuses to start without `JWT_SECRET`. A missing, invalid or expired token returns 401, which sends the user back to the login page; 403 means signed in but not admin.

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
  components/   shared UI components, plus planning/ and todo/ for those pages
  context/      AuthContext
  config/       API base URL config
  hooks/        useDataRefresh (Refresh button and stale-data reload)
  utils/        shared helpers (planning formatting)
```

Page CSS files are global in Vite, so new pages prefix their class names (`plan-`, `todo-`) to avoid clashing with others.

## Data Refresh

Pages load once on open. The Refresh button reloads the current page's data, and returning to the app or browser tab reloads it only if it is more than 30 minutes old. Reloads happen in the background: the current data and scroll position stay on screen.

## Deployment

The frontend deploys to Azure Static Web Apps via GitHub Actions on push to `main`. The API deploys as an Azure Functions app. Both are configured in the Azure portal.

Environment variables for the deployed API are set in the Azure Functions app settings (equivalent to `local.settings.json` in production).

### Schema changes

The schema lives in Turso only. Changes go in one-off scripts in `api/src/scripts/`, run locally against Turso with `local.settings.json`. Run the script before redeploying the API, and redeploy the API before merging client changes that call new endpoints. `migrate-planning-todo.js` adds the Planning and To do columns and tables; it is additive and safe to re-run.

## Trip

38 stops across Peru, Ecuador, Bolivia, Chile, and Argentina. Starts November 2026.
