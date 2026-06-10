# Project Context

## Purpose
A travel tracking app that records trips, locations, and timeline data across South America.

Also adds packing lists and useful information. A one-stop app for all needs for travellers as well as to be viewed by family.

The goal is to track journeys and surface them through a simple interface.

---

## Current State
- Prototype-level application
- Mixed structure (api/server overlap)
- Previously used local SQLite (now migrated to Turso)
- Hosted on Azure Static Web Apps, using Azure Functions for API
- Some bugs and inconsistent data handling
- Testing done on prod Web App interface, not local file
- Github Action workflow updates Static Web App after commit, API changes need redeployment of Function App

---

## Stack
- Backend: Node.js
- Frontend: Web client (React-style structure)
- Database: Turso (libSQL)

---

## Data Storage (Important)
- Uses Turso via @libsql/client
- No local SQLite or filesystem-based persistence
- All data must persist across deployments

---

## Key Problems
- Backend structure is unclear (routing vs logic mixed)
- Database logic is embedded in multiple places
- Some writes/reads are unreliable
- Hard to extend safely
- Deployments of Function App loses data
- Multiple dependencies across APIs need untangling and simplifying

---

## Priorities (in order)

1. Stabilise database usage (Turso fully working)
2. Separate concerns:
   - API (routing)
   - Services (logic)
   - DB (data access)
3. Fix bugs and ensure data integrity
4. Make the codebase easy to understand and extend
5. Tidy up unnecessary files, migrations
6. Add new features on top of stable foundations

---

## Constraints
- Keep things simple — this is not an enterprise system
- Do not introduce heavy frameworks or over-engineering
- Changes must be incremental (no full rewrites)

---

## Non-goals (for now)
- High scalability
- Complex infrastructure
- Advanced security patterns

---

## Expected Outcome
A clean, structured app that:
- reliably reads/writes travel data
- has clear separation of concerns
- can be extended or productionised later
- README.md always up to date with changes, in a clear, concise manner. Operate change control