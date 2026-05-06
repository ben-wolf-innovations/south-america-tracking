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

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd south-america-tracking
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```
   Or install individually:
   ```bash
   npm install          # Root dependencies
   cd client && npm install
   cd ../server && npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files and customize
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   
   # Edit the .env files with your preferred PINs and settings
   ```

4. **Initialize the database**
   ```bash
   node server/init-db.js
   ```
   This will create the SQLite database with schema and load seed data from your itinerary.

5. **Start development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## ✅ What's Implemented

- ✅ Project structure and configuration
- ✅ React frontend with Vite (mobile-responsive)
- ✅ API client with auth interceptors
- ✅ Express backend with middleware
- ✅ Database abstraction layer (SQLite with sql.js)
- ✅ JWT authentication system with PIN-based access
- ✅ Database schema (38 locations from your itinerary)
- ✅ Database initialization with seed data
- ✅ **Complete RESTful API (Phase 2)**
  - ✅ Locations CRUD with dynamic sequence reordering
  - ✅ Costs tracking with planned vs actual
  - ✅ Blog posts with draft/publish workflow
  - ✅ Progress tracking with auto-recalculation
- ⏳ Frontend components (route manager, map, blog)
- ⏳ Route mapping with Leaflet
- ⏳ Cost tracking dashboard
- ⏳ Authentication UI (login page)

## 📁 Project Structure

```
south-america-tracking/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # State management
│   │   └── config/        # API configuration
│   └── .env.example
├── server/                # Express backend
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth, validation
│   ├── config/           # Database config
│   └── .env.example
├── database/             # SQLite database & scripts
│   ├── schema.sql        # Database schema
│   ├── seed.sql          # Sample data
│   └── init.js           # Initialization script
└── package.json          # Root scripts
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