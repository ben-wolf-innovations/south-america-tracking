# South America Trip Tracker

A mobile-responsive web application for tracking a 6-month South America journey. Features include route mapping, cost tracking (planned vs actual), accommodation management, progress tracking, and a travel blog with dual access levels (full edit mode and family read-only view).

## 🌎 Overview

This app helps manage and share our South America adventure, covering 43 locations across Peru, Ecuador, Bolivia, Chile, and Argentina. It provides:

- **Interactive route map** with all planned locations and travel connections
- **Cost tracking** comparing planned vs actual expenses across categories
- **Accommodation details** for each stop
- **Travel blog** with rich text editing
- **Progress tracking** showing current location and journey completion
- **Dual views**: Full access for travelers, read-only view for family

## 🏗️ Architecture

**Tech Stack:**
- **Frontend**: React + Vite (fast, modern)
- **Backend**: Node.js + Express
- **Database**: SQLite with sql.js (pure JS, ARM64 compatible) → Azure SQL (production)
- **Maps**: Leaflet.js with OpenStreetMap tiles
- **Authentication**: JWT with PIN-based access (2 levels)

**Design Principles:**
- Mobile-first responsive design
- Environment-based configuration for easy local → cloud migration
- Database abstraction layer for seamless DB switching
- Zero cost during development

## 📋 Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for version control)

Optional:
- **Docker Desktop** (for containerized development)

## 🚀 Quick Start

### Option 1: Local Development (Recommended for Frontend Work)

**Perfect for:** Collaborating on React components, making UI changes, testing locally.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd south-america-tracking
   ```

2. **Install dependencies and start servers**
   ```bash
   npm install
   npm run dev
   ```
   
   That's it! The app will start with:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Database already included with all locations and seed data

3. **Login credentials:**
   - **Admin PIN:** `1234` (full edit access)
   - **Family PIN:** `5678` (read-only view)

**Note:** The database file (`database/trip.db`) is included in the repository with all seed data, so no initialization needed!

---

### Option 2: Docker Development (Guaranteed Environment)

**Perfect for:** Ensuring identical environment across different machines, no Node.js installation needed.

1. **Prerequisites:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. **Clone and start**
   ```bash
   git clone <repository-url>
   cd south-america-tracking
   docker-compose up
   ```

3. **Access the app:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

4. **Stop the containers:**
   ```bash
   docker-compose down
   ```

**Hot-reload enabled:** Changes to React files will automatically refresh in both modes!

---

### Manual Setup (Advanced)

<details>
<summary>Click to expand manual installation steps</summary>

If you need more control over the setup:

1. **Install dependencies**
   ```bash
   npm install          # Root dependencies
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

2. **Environment variables (optional)**
   ```bash
   # Copy example files if you want to customize
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

3. **Database setup**
   
   Database is already included, but if you need to reinitialize:
   ```bash
   node server/init-db.js
   ```

4. **Start servers separately**
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend  
   cd client && npm run dev
   ```

</details>

## ✅ What's Implemented

### Backend (100% Complete)
- ✅ Express server with CORS, JSON middleware, request logging
- ✅ SQLite database with sql.js (ARM64 compatible, pure JavaScript)
- ✅ JWT authentication with PIN-based access (admin + family levels)
- ✅ Database abstraction layer with prepare/bind/step pattern
- ✅ Complete RESTful API:
  - ✅ **Trips**: GET/PUT for trip management, start/end dates
  - ✅ **Locations**: Full CRUD, reordering, check-in functionality, soft delete
  - ✅ **Costs**: Full CRUD, category tracking, budget vs actual, soft delete
  - ✅ **Blog**: Full CRUD, draft/publish workflow, rich text support
- ✅ Auto-calculating days elapsed from trip start date
- ✅ One-way cost sync (locations = budget, costs = actual)

### Frontend (100% Complete)
- ✅ React 18 + Vite with mobile-first responsive design
- ✅ Authentication flow (Login page with PIN entry)
- ✅ Protected routes with role-based access control
- ✅ **Dashboard** with dynamic navigation and footer
- ✅ **Overview Page**: Trip stats, current location, cost breakdown (admin only)
- ✅ **Interactive Map**: Leaflet.js with 38 markers, route polyline, color-coded (current/visited/planned)
- ✅ **Locations Manager**: Full CRUD, inline editing, date management, reordering, check-in
- ✅ **Cost Tracker**: Budget summary, category breakdown, filters, CRUD operations
- ✅ **Blog Editor**: React-Quill rich text editor, preview modal, publish toggle
- ✅ Dynamic footer with auto-updating location/day counts

### Features
- ✅ Role-based access: Admin (full edit) vs Family (read-only Overview/Map/Blog)
- ✅ Real-time updates with hot-reload in development
- ✅ Soft delete for costs and locations (data integrity)
- ✅ Floating-point precision handling for monetary values
- ✅ Trip start date editor with auto-calculation
- ✅ Enhanced map tooltips with detailed location info
- ✅ Date clearing functionality
- ✅ Location scroll-to-view after reordering

### Ready for Collaboration
- ✅ Database included in repository with seed data (38 locations, 5 countries, 98 days)
- ✅ Docker setup for guaranteed environment
- ✅ Git workflow with 30+ commits tracking all changes

## 📁 Project Structure

```
south-america-tracking/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components (Dashboard, ProtectedRoute)
│   │   ├── pages/         # Page components (Overview, Map, Locations, Costs, Blog)
│   │   ├── context/       # State management (AuthContext)
│   │   └── config/        # API configuration
│   ├── Dockerfile         # Docker config for frontend
│   ├── .dockerignore      # Docker ignore patterns
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API endpoints (auth, trips, locations, costs, blog)
│   ├── middleware/       # Auth, validation
│   ├── config/           # Database config (sql.js abstraction)
│   ├── Dockerfile        # Docker config for backend
│   ├── .dockerignore     # Docker ignore patterns
│   └── package.json
├── database/             # SQLite database & scripts
│   ├── trip.db          # SQLite database (included in repo!)
│   ├── schema.sql       # Database schema
│   ├── seed.sql         # Seed data (38 locations)
│   └── init.js          # Initialization script
├── docker-compose.yml    # Docker orchestration
├── package.json          # Root scripts
└── README.md
```

## 🤝 Collaboration Guide

### For Frontend Developers

1. **Clone the repo** - Database and all setup is included!
2. **Run `npm install && npm run dev`** - App starts immediately
3. **Edit React files** in `client/src/` - Changes hot-reload instantly
4. **Test with both PINs:**
   - Admin (1234): Full edit access
   - Family (5678): Read-only view
5. **Commit and push** your changes

### What's Safe to Edit

✅ **Frontend files:** All files in `client/src/`
✅ **Styles:** All `.css` files
✅ **Components:** Create new components in `client/src/components/`
✅ **Pages:** Modify existing pages in `client/src/pages/`

⚠️ **Ask before changing:**
- Backend API routes (`server/routes/`)
- Database schema (`database/schema.sql`)
- Authentication logic (`server/middleware/auth.js`)

### Git Workflow

```bash
# Pull latest changes
git pull origin main

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

## 🔑 Authentication

Two PIN-based access levels (configured in server/.env):
- **Admin PIN**: Full edit access (for travelers)
- **Family PIN**: Read-only view (for family members)

No user accounts needed - just two PINs with different access levels.

## 💰 Cost

**Development**: £0 (runs locally)
**Production**: £5-10/month when deployed to Azure (deferred until needed)

## 📝 Development Workflow

- Work on feature branches
- Commit after each major feature with descriptive messages
- Keep README updated with new features
- Test on mobile devices regularly

## 🚢 Deployment (Future)

Deployment to Azure will be configured closer to trip start date. Migration scripts are prepared to transfer SQLite data to Azure SQL Database.

## 📊 Database Schema

The SQLite database consists of the following tables:

**trips** - Overall trip information
- id, name, description, start_date, end_date, status

**locations** - Each stop on the journey
- Sequence-based ordering (supports dynamic reordering)
- Location details: name, country, lat/lng for mapping
- Stay duration: nights, arrival_date, departure_date
- Accommodation: name, planned/actual costs, booking reference
- Activities: description, planned/actual costs
- Daily costs: food & drink (planned/actual)
- Travel: method, notes, planned/actual costs
- Tracking: is_current, visited flags

**costs** - Detailed expense tracking (optional granular tracking)
- Links to locations and categories
- Supports multiple currencies
- Tracks planned vs actual amounts

**blog_posts** - Travel journal
- Title, rich text content
- Published status and dates
- Links to specific locations

**progress** - Journey tracking
- Current location and day
- Locations visited vs total
- Total spent vs planned budget

**auth** - PIN-based authentication
- Admin PIN (full edit access)
- Family PIN (read-only view)

**Views:**
- `location_days_view` - Calculates cumulative day counter
- `location_costs_view` - Aggregates all costs per location

The schema supports:
- ✅ Dynamic reordering of locations (sequence numbers)
- ✅ Revisited locations (e.g., Buenos Aires appears 3 times)
- ✅ Planned vs actual cost tracking across all categories
- ✅ Running day counter auto-calculated from sequence
- ✅ Map coordinates for route visualization

## � API Endpoints

All API endpoints require JWT authentication. Admin PIN required for mutations.

### Authentication
- `POST /api/auth/login` - Login with PIN, returns JWT token
- `POST /api/auth/verify` - Verify token validity

### Locations
- `GET /api/locations` - Get all locations (ordered by sequence)
- `GET /api/locations/:id` - Get single location
- `POST /api/locations` - Create location (optional sequence for insertion)
- `PUT /api/locations/:id` - Update location details
- `PUT /api/locations/:id/reorder` - Change sequence position
- `DELETE /api/locations/:id` - Delete and resequence

### Costs
- `GET /api/costs` - Get all costs (filterable by location/category)
- `GET /api/costs/summary` - Get planned vs actual breakdown
- `GET /api/costs/:id` - Get single cost entry
- `POST /api/costs` - Create cost entry
- `PUT /api/costs/:id` - Update cost entry
- `DELETE /api/costs/:id` - Delete cost entry

### Blog
- `GET /api/blog` - Get blog posts (family sees published only)
- `GET /api/blog/:id` - Get single post
- `POST /api/blog` - Create post (draft or published)
- `PUT /api/blog/:id` - Update post content/metadata
- `PUT /api/blog/:id/publish` - Toggle publish status
- `DELETE /api/blog/:id` - Delete post

### Progress
- `GET /api/progress` - Get trip progress with current location
- `PUT /api/progress` - Update progress metrics
- `POST /api/progress/recalculate` - Auto-calculate from locations & costs

## �🗺️ Itinerary Overview

43 stops across 5 countries over ~103 days:
- Peru: 9 locations (Lima, Cusco, Sacred Valley, Machu Picchu, etc.)
- Ecuador: 6 locations (Quito, Galapagos, Amazon, etc.)
- Bolivia: 8 locations (La Paz, Uyuni Salt Flats, etc.)
- Chile: 6 locations (Atacama, Santiago, Torres del Paine, etc.)
- Argentina: 14 locations (Buenos Aires, Patagonia, Iguazu Falls, etc.)

---

**Status**: 🚧 In Development