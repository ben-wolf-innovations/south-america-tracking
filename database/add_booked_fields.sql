-- Add accommodation_booked and transport_booked fields to locations table
ALTER TABLE locations ADD COLUMN accommodation_booked INTEGER DEFAULT 0;
ALTER TABLE locations ADD COLUMN transport_booked INTEGER DEFAULT 0;
