-- South America Trip Tracker Database Schema
-- SQLite database (compatible with future migration to Azure SQL)

-- Trips table: stores overall trip information
CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT, -- ISO 8601 date format (YYYY-MM-DD)
    end_date TEXT,
    status TEXT DEFAULT 'planning', -- planning, active, completed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Locations table: stores each stop on the journey
-- Includes accommodation and travel details
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL, -- Order in the itinerary (allows dynamic reordering)
    
    -- Location details
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL, -- For map display
    longitude REAL,
    
    -- Stay duration
    nights INTEGER DEFAULT 0, -- Length of stay in nights
    arrival_date TEXT, -- ISO 8601 date
    departure_date TEXT,
    
    -- Accommodation
    accommodation_name TEXT,
    accommodation_cost_planned REAL DEFAULT 0, -- Per night or total based on nights
    accommodation_cost_actual REAL,
    accommodation_notes TEXT,
    accommodation_booking_ref TEXT,
    
    -- Activities
    activities TEXT, -- Comma-separated or descriptive text
    activities_cost_planned REAL DEFAULT 0,
    activities_cost_actual REAL,
    
    -- Daily costs
    food_drink_cost_planned REAL DEFAULT 0, -- Daily average
    food_drink_cost_actual REAL,
    
    -- Travel to this location
    travel_method TEXT, -- e.g., "Fly", "Bus", "Drive", "Trek", "Boat"
    travel_notes TEXT,
    travel_cost_planned REAL DEFAULT 0,
    travel_cost_actual REAL,
    
    -- Additional notes
    notes TEXT,
    
    -- Tracking
    is_current BOOLEAN DEFAULT 0, -- Mark current location
    visited BOOLEAN DEFAULT 0, -- Mark if actually visited
    visited_date TEXT,
    deleted BOOLEAN DEFAULT 0, -- Soft delete flag
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    UNIQUE(trip_id, sequence) -- Ensure unique sequence per trip
);

-- Create index for faster sequence-based queries
CREATE INDEX IF NOT EXISTS idx_locations_sequence ON locations(trip_id, sequence);
CREATE INDEX IF NOT EXISTS idx_locations_current ON locations(is_current);

-- Costs table: detailed expense tracking
-- Allows multiple cost entries per location and category
-- Note: Planned/budgeted costs are tracked in the locations table
CREATE TABLE IF NOT EXISTS costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    location_id INTEGER, -- NULL for trip-wide costs
    
    category TEXT NOT NULL, -- 'accommodation', 'activities', 'food', 'travel', 'other'
    description TEXT,
    
    amount_actual REAL,
    currency TEXT DEFAULT 'GBP',
    
    date TEXT, -- ISO 8601 date when cost incurred
    
    notes TEXT,
    deleted BOOLEAN DEFAULT 0, -- Soft delete flag
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_costs_location ON costs(location_id);
CREATE INDEX IF NOT EXISTS idx_costs_category ON costs(category);

-- Blog posts table: travel journal entries
CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    location_id INTEGER, -- Associate with a specific location
    
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Rich text/HTML content
    
    published BOOLEAN DEFAULT 0,
    published_date TEXT,
    
    created_by TEXT DEFAULT 'admin', -- 'admin' or name
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published, published_date);
CREATE INDEX IF NOT EXISTS idx_blog_location ON blog_posts(location_id);

-- Progress table: tracks journey progress
CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL UNIQUE,
    
    current_location_id INTEGER,
    current_day INTEGER DEFAULT 0, -- Current day of journey
    total_days INTEGER DEFAULT 0, -- Total planned days
    
    locations_visited INTEGER DEFAULT 0,
    total_locations INTEGER DEFAULT 0,
    
    total_spent REAL DEFAULT 0, -- Running total of actual costs
    total_planned REAL DEFAULT 0, -- Total planned budget
    
    notes TEXT,
    last_updated TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (current_location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Authentication table: stores PIN hashes for access control
CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_level TEXT NOT NULL UNIQUE, -- 'admin' or 'family'
    pin_hash TEXT NOT NULL, -- bcrypt hash of PIN
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_trips_timestamp 
AFTER UPDATE ON trips
BEGIN
    UPDATE trips SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_locations_timestamp 
AFTER UPDATE ON locations
BEGIN
    UPDATE locations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_blog_posts_timestamp 
AFTER UPDATE ON blog_posts
BEGIN
    UPDATE blog_posts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_progress_timestamp 
AFTER UPDATE ON progress
BEGIN
    UPDATE progress SET last_updated = datetime('now') WHERE id = NEW.id;
END;

-- View: Calculate running day totals for each location
CREATE VIEW IF NOT EXISTS location_days_view AS
SELECT 
    l.id,
    l.trip_id,
    l.sequence,
    l.name,
    l.country,
    l.nights,
    -- Calculate cumulative days up to and including this location
    (SELECT COALESCE(SUM(nights), 0) 
     FROM locations l2 
     WHERE l2.trip_id = l.trip_id AND l2.sequence <= l.sequence) as cumulative_days
FROM locations l
ORDER BY l.trip_id, l.sequence;

-- View: Calculate total costs per location
CREATE VIEW IF NOT EXISTS location_costs_view AS
SELECT 
    l.id as location_id,
    l.name,
    l.country,
    l.sequence,
    -- Planned costs
    COALESCE(l.accommodation_cost_planned, 0) as accommodation_planned,
    COALESCE(l.activities_cost_planned, 0) as activities_planned,
    COALESCE(l.food_drink_cost_planned * l.nights, 0) as food_planned,
    COALESCE(l.travel_cost_planned, 0) as travel_planned,
    COALESCE(l.accommodation_cost_planned, 0) + 
    COALESCE(l.activities_cost_planned, 0) + 
    COALESCE(l.food_drink_cost_planned * l.nights, 0) + 
    COALESCE(l.travel_cost_planned, 0) as total_planned,
    -- Actual costs
    COALESCE(l.accommodation_cost_actual, 0) as accommodation_actual,
    COALESCE(l.activities_cost_actual, 0) as activities_actual,
    COALESCE(l.food_drink_cost_actual, 0) as food_actual,
    COALESCE(l.travel_cost_actual, 0) as travel_actual,
    COALESCE(l.accommodation_cost_actual, 0) + 
    COALESCE(l.activities_cost_actual, 0) + 
    COALESCE(l.food_drink_cost_actual, 0) + 
    COALESCE(l.travel_cost_actual, 0) as total_actual
FROM locations l;
