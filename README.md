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
- **Database**: SQLite (local development) → Azure SQL (production)
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

3. **Set up environment variables**
   ```bash
   # Copy example files and customize
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

4. **Initialize the database** (coming soon)
   ```bash
   cd database
   node init.js
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

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

(Coming soon - will document tables for trips, locations, accommodations, costs, blog, and progress tracking)

## 🗺️ Itinerary Overview

43 stops across 5 countries over ~103 days:
- Peru: 9 locations (Lima, Cusco, Sacred Valley, Machu Picchu, etc.)
- Ecuador: 6 locations (Quito, Galapagos, Amazon, etc.)
- Bolivia: 8 locations (La Paz, Uyuni Salt Flats, etc.)
- Chile: 6 locations (Atacama, Santiago, Torres del Paine, etc.)
- Argentina: 14 locations (Buenos Aires, Patagonia, Iguazu Falls, etc.)

---

**Status**: 🚧 In Development