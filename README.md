# South America Trip Tracker

A mobile-responsive web application for tracking a 6-month South America journey. Features include route mapping, cost tracking (planned vs actual), accommodation management, progress tracking, and a travel blog with dual access levels (full edit mode and family read-only view).

## Overview

This app helps manage and share our South America adventure, covering 38 locations across 5 countries (Peru, Ecuador, Bolivia, Chile, and Argentina) over 98 days. It provides:

- Interactive route map with all planned locations and travel connections
- Cost tracking comparing planned vs actual expenses across categories
- Accommodation details for each stop with per-night budget tracking
- Travel blog with rich text editing
- Progress tracking showing current location and journey completion
- Dual views: Full access for travelers, read-only view for family
- Modern, sleek design with vibrant color palette (teal, orange, purple)

## Architecture

**Tech Stack:**
- Frontend: React 18.3.1 + Vite 5.3.4 (fast, modern)
- Backend: Azure Functions v4 (Node.js) - migrated from Express for free Azure hosting
- Database: SQLite with sql.js stored in Azure Blob Storage
- Maps: Leaflet.js with react-leaflet and OpenStreetMap tiles
- Authentication: JWT with PIN-based access (2 levels)

**Design System:**
- Primary color: Teal (#14b8a6)
- Secondary color: Orange (#f97316)
- Accent color: Purple (#8b5cf6)
- Sans-serif font family throughout
- Comprehensive CSS variable system with shadow and radius tokens
- Mobile-first responsive design

## Prerequisites

- Node.js v18+ (Download from https://nodejs.org/)
- npm (comes with Node.js)
- Git (for version control)

Optional:
- Docker Desktop (for containerized development)

## Quick Start

### Option 1: Local Development (Recommended)

Perfect for collaborating on React components and making UI changes.

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd south-america-tracking
   ```

2. Install dependencies
   ```bash
   npm install
   cd client && npm install
   cd ../api && npm install
   cd ..
   ```

3. Configure Azure Functions backend
   ```bash
   cd api
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your Azure Storage connection string
   npm run upload-db  # Upload database to Azure Blob Storage
   ```

4. Start the servers
   ```bash
   # Terminal 1 - Azure Functions backend
   cd api && npm start
   
   # Terminal 2 - React frontend
   cd client && npm run dev
   ```
   
   The app will start with:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:7071/api

5. Login credentials:
   - Admin PIN: 1234 (full edit access)
   - Family PIN: 5678 (read-only view)

---

### Option 2: Docker Development (Guaranteed Environment)

Perfect for ensuring identical environment across different machines.

1. Prerequisites: Install Docker Desktop from https://www.docker.com/products/docker-desktop/

2. Clone and start
   ```bash
   git clone <repository-url>
   cd south-america-tracking
   docker-compose up
   ```

3. Access the app:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

4. Stop the containers:
   ```bash
   docker-compose down
   ```

Hot-reload enabled: Changes to React files will automatically refresh.

---

### Manual Setup (Advanced)

If you need more control over the setup:

1. Install dependencies
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

2. Optional: Set environment variables
   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

3. Database setup (already included, but reinitialize if needed)
   ```bash
   node server/init-db.js
   ```

4. Start servers separately
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend  
   cd client && npm run dev
   ```

## Network Sharing (Mac/Windows)

To let your partner access the app from her Mac on the same Wi-Fi network:

See [SHARING.md](SHARING.md) for complete step-by-step instructions. The process involves:
- Creating a .env file with your Windows IP
- Updating Vite to accept network connections
- Opening firewall ports
- Your partner visits http://YOUR_IP:5173 from her browser

## What's Implemented

### Backend (Azure Functions v4)
- Serverless HTTP triggers with Azure Functions
- SQLite database in Azure Blob Storage (automatic persistence)
- JWT authentication with PIN-based access (admin + family levels)
- Database abstraction layer for transactions and queries
- Complete RESTful API with 30 endpoints across 8 function modules
- One-way cost sync (locations = budget, costs = actual)
- Estimated date calculations based on last visited location
- Strict sequential check-in validation
- Live exchange rates from external API (30-minute cache)
- Role-based blog post filtering

### Frontend - Core Pages
- React 18 + Vite with mobile-first responsive design
- Authentication flow with PIN entry
- Protected routes with role-based access control
- Dashboard with dynamic navigation
- Overview: Trip stats, current location, total budget card, category breakdown, country breakdown (admin only)
- Interactive Map: 38 markers, route polyline, color-coded (current/visited/planned), stacked location handling
- Locations Manager: Full CRUD, inline editing, date management, reordering, check-in
- Cost Tracker: Budget vs actual breakdown, category and country summaries
- Blog Editor: React-Quill rich text editor, preview modal, publish toggle

### Features Implemented
- Role-based access: Admin (full edit) vs Family (read-only)
- Real-time updates with hot-reload in development
- Soft delete for data integrity
- Dynamic location insertion at any sequence with automatic recalculation
- Strict sequential check-in validation (prevents skipping locations)
- Undo last visited and Clear all visited buttons
- Map marker stacking with circular offset for overlapping locations
- Sequence numbers displayed in map popups
- Accommodation budget: per-night rate for planning, total for actual spend
- Food & Drink budget: per-day rate for planning, total for actual spend (days = nights + 1)
- Activities budget: total for entire stay
- Travel budget: total for the journey
- Estimated arrival/departure dates calculated from last visited location
- Floating-point precision handling for monetary values
- Trip start date editor with auto-calculation
- Modern design system with CSS variables and gradients
- Responsive design for desktop and mobile

### Ready for Collaboration
- Database included with all 38 locations, 5 countries, 98 days
- Docker setup for guaranteed environment
- Git workflow with clear commit history

## Project Structure

```
south-america-tracking/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable components (Dashboard, ProtectedRoute)
│   │   ├── pages/              # Page components (Overview, Map, Locations, Costs, Blog)
│   │   │   ├── Overview.jsx     # Trip overview with budget cards (admin only)
│   │   │   ├── Map.jsx          # Interactive Leaflet map with check-in
│   │   │   ├── Locations.jsx    # Location CRUD and management
│   │   │   ├── Costs.jsx        # Cost tracking and budget breakdown
│   │   │   └── Blog.jsx         # Travel blog with (updated for Azure Functions)
│   │   └── App.css             # Global design system
│   ├── vite.config.js
│   └── package.json
├── api/                        # Azure Functions v4 backend
│   ├── src/
│   │   ├── functions/          # HTTP trigger functions
│   │   │   ├── auth.js         # Authentication (PIN-based JWT)
│   │   │   ├── trips.js        # Trip management
│   │   │   ├── locations.js    # Location CRUD with sequence management
│   │   │   ├── costs.js        # Cost CRUD and summary calculations
│   │   │   ├── packing.js      # Packing list with soft delete
│   │   │   ├── progress.js     # Check-in and progress tracking
│   │   │   ├── info.js         # Travel info and exchange rates
│   │   │   └── blog.js         # Blog post management with role filtering
│   │   ├── shared/             # Shared utilities
│   │   │   ├── database.js     # Azure Blob Storage SQLite wrapper
│   │   │   └── auth.js         # JWT authentication middleware
│   │   └── index.js            # Functions entry point
│   ├── scripts/                # Utility scripts
│   │   ├── upload-database.js  # Upload DB to Azure Blob
│   │   └── test-database.js    # Test connection
│   ├── host.json               # Azure Functions host config
│   ├── local.settings.json     # Local environment variables
│   └── package.json
├── database/                   # Original SQLite database (for migration)
│   ├── trip.db                # Main database (now in Azure Blob Storage)
│   ├── schema.sql             # Database schema
│   └── seed.sql               # Seed data (56 locations)
├── server/                     # Legacy Express server (deprecated)
├── package.json                # Root script
├── package.json               # Root scripts
├── SHARING.md                 # Network sharing instructions
└── README.md
```

## Authentication & Access Control

Two PIN-based access levels:
- Admin PIN (1234): Full edit access to all pages and operations
- Family PIN (5678): Read-only access to Overview, Map, and Blog

No user accounts needed, just PIN-based authentication with JWT tokens.

## Cost Tracking

### Budget Semantics
- Accommodation: Budget is per-night rate. Actual is total for the entire stay.
- Food & Drink: Budget is per-day rate. Actual is total for entire stay (multiply by nights + 1 for arrival and departure days).
- Activities: Budget and actual are both totals for the entire stay.
- Transport: Budget and actual are both totals for the journey segment.

### Cost Breakdown Pages
- Overview page (admin only): Total budget card, category breakdown, country breakdown
- Costs page: Detailed cost entry management, category breakdown, country breakdown
- Locations page: Budget and actual costs displayed for each location

## Database Schema

**trips** - Overall trip information
- id, name, description, start_date, end_date

**locations** - Each stop on the journey
- Sequence-based ordering (supports dynamic insertion)
- Location: name, country, latitude, longitude
- Stay: nights, arrival_date, departure_date, estimated_arrival_date, estimated_departure_date
- Accommodation: name, type, cost_planned (per night), cost_actual (total)
- Activities: description, cost_planned (total), cost_actual (total)
- Food & Drink: cost_planned (per day), cost_actual (total)
- Travel: from, method, duration, cost_planned (total), cost_actual (total)
- Tracking: is_current, visited flags

**costs** - Detailed expense tracking
- Links to locations and categories
- Supports multiple currencies
- Tracks date and description
- amount_actual only (budget comes from locations)

**blog_posts** - Travel journal
- Title, rich text content
- Published status

**progress** - Journey tracking (auto-calculated from locations)
- Current location and day
- Locations visited count

The schema supports:
- Dynamic reordering of locations at any sequence
- Revisited locations (e.g., Buenos Aires at sequences 34, 36, 38)
- Planned vs actual cost tracking across all categories
- Running day counter auto-calculated from sequence
- Map coordinates for route visualization

## API Endpoints

All endpoints require JWT authentication. Admin PIN required for mutations.

### Authentication
- POST /api/auth/login - Login with PIN, returns JWT token
- POST /api/auth/verify - Verify token validity

### Locations
- GET /api/locations - Get all locations with estimated dates
- GET /api/locations/:id - Get single location
- POST /api/locations - Create location with optional sequence insertion
- PUT /api/locations/:id - Update location details
- DELETE /api/locations/:id - Delete and resequence remaining locations

### Progress (Check-in)
- GET /api/progress - Get trip progress
- POST /api/progress/check-in - Check in to a location (strict sequential validation)
- POST /api/progress/undo-last-visited - Undo last check-in
- POST /api/progress/clear-all-visited - Clear all visited flags

### Costs
- GET /api/costs - Get all costs with filters
- GET /api/costs/summary - Get planned vs actual breakdown by category and country
- GET /api/costs/:id - Get single cost entry
- POST /api/costs - Create cost entry
- PUT /api/costs/:id - Update cost entry
- DELETE /api/costs/:id - Delete cost entry

### Blog
- GET /api/blog - Get blog posts (family sees published only)
- GET /api/blog/:id - Get single post
- POST /api/blog - Create post
- PUT /api/blog/:id - Update post
- PUT /api/blog/:id/publish - Toggle publish status
- DELETE /api/blog/:id - Delete post

## Trip Overview

38 stops across 5 countries over 98 days:
- Peru: 9 locations (Lima, Cusco, Sacred Valley, Machu Picchu, etc.)
- Ecuador: 6 locations (Quito, Amazon, etc.)
- Bolivia: 8 locations (La Paz, Uyuni Salt Flats, etc.)
- Chile: 6 locations (Atacama, Santiago, Torres del Paine, etc.)
- Argentina: 9 locations (Buenos Aires, Patagonia, Iguazu Falls, etc.)

Start: November 1, 2026
End: April 30, 2027

## Development Workflow

1. Work on feature branches
2. Commit with descriptive messages
3. Test on mobile devices regularly
4. Update README for new features
5. Keep code clean with hot-reload feedback

## Collaboration Guide

### For Frontend Developers

1. Clone the repo - database and setup are included
2. Run `npm install && npm run dev` - app starts immediately
3. Edit React files in `client/src/` - changes hot-reload instantly
4. Test with both PINs (1234 admin, 5678 family)
5. Commit and push your changes

### Safe to Edit

- All files in `client/src/`
- All CSS files
- Create new components in `client/src/components/`
- Modify pages in `client/src/pages/`

### Consult Before Changing

- Backend API routes (`server/routes/`)
- Database schema (`database/schema.sql`)
- Authentication logic (`server/middleware/auth.js`)

## Cost

- Development: Free (runs locally)
- Production: GBP 5-10/month when deployed to Azure (deferred until needed)

## Status

In Development - Feature complete, awaiting trip start date (November 1, 2026)