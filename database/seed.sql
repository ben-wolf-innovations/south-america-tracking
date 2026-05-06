-- Seed data for South America Trip
-- Based on actual itinerary CSV

-- Insert main trip
INSERT INTO trips (id, name, description, start_date, end_date, status) VALUES 
(1, 'South America Adventure 2026', 'Epic 6-month journey across Peru, Ecuador, Bolivia, Chile, and Argentina', '2026-11-01', '2027-04-30', 'planning');

-- Insert locations based on CSV data
-- Note: Some locations combined or simplified for initial seed
-- Latitude/Longitude are approximate - can be updated in the app

INSERT INTO locations (trip_id, sequence, name, country, latitude, longitude, nights, accommodation_name, accommodation_cost_planned, activities, activities_cost_planned, food_drink_cost_planned, travel_method, travel_notes, travel_cost_planned) VALUES
-- Peru
(1, 1, 'Lima', 'Peru', -12.0464, -77.0428, 2, NULL, 40.00, NULL, 0, 0, 'Fly', 'Fly UK -> Europe -> Lima', 2000.00),
(1, 2, 'Cusco', 'Peru', -13.5320, -71.9675, 2, NULL, 30.00, NULL, 0, 0, 'Fly', 'Fly Lima -> Cusco', 100.00),
(1, 3, 'Sacred Valley', 'Peru', -13.3167, -72.0833, 2, NULL, 25.00, NULL, 0, 0, 'Bus', 'Bus from Cusco', 20.00),
(1, 4, 'Machu Picchu', 'Peru', -13.1631, -72.5450, 3, NULL, 0.00, 'Inca Trail', 1400.00, 0, 'Trek', 'Multi-day trek', 0.00),
(1, 5, 'Arequipa', 'Peru', -16.4090, -71.5375, 4, NULL, 30.00, 'Colca Canyon', 0, 0, 'Fly', 'Fly Cusco -> Arequipa. Fly Arequipa -> Lima', 200.00),
(1, 6, 'Ica', 'Peru', -14.0678, -75.7286, 3, NULL, 30.00, 'Nazca, Huacachina', 0, 0, 'Bus', 'Bus Lima -> Ica. Bus Ica -> Lima', 50.00),
(1, 7, 'Huaraz', 'Peru', -9.5286, -77.5278, 3, NULL, 25.00, 'Laguna 69', 0, 0, 'Bus', 'Bus Lima -> Huaraz', 40.00),
(1, 8, 'Trujillo', 'Peru', -8.1116, -79.0287, 2, NULL, 25.00, 'Chan Chan, beach', 0, 0, 'Bus', 'Bus Huaraz -> Trujillo. Bus Trujillo -> Lima', 80.00),
(1, 9, 'Iquitos', 'Peru', -3.7437, -73.2516, 5, NULL, 40.00, 'Amazon. River Cruise', 0, 0, 'Fly', 'Fly Lima -> Iquitos. Fly Iquitos -> Lima', 300.00),

-- Ecuador
(1, 10, 'Quito', 'Ecuador', -0.1807, -78.4678, 2, NULL, 30.00, NULL, 0, 0, 'Fly', 'Fly Lima -> Quito', 200.00),
(1, 11, 'Latacunga', 'Ecuador', -0.9346, -78.6153, 2, NULL, 25.00, 'Quilotoa Lake', 0, 0, 'Bus', 'Bus Quito -> Latacunga', 40.00),
(1, 12, 'Banos Canton', 'Ecuador', -1.3958, -78.4269, 2, NULL, 0.00, NULL, 0, 0, 'Bus', 'Bus Latacunga -> Banos', 40.00),
(1, 13, 'Tena', 'Ecuador', -0.9899, -77.8139, 3, NULL, 20.00, 'Rainforest Lodge', 0, 0, 'Bus', 'Bus Banos -> Tena. Bus Tena -> Quito', 80.00),
(1, 14, 'Galapagos', 'Ecuador', -0.9538, -90.9656, 6, NULL, 40.00, 'Island tours', 1200.00, 0, 'Fly', 'Fly Quito -> Galapagos. Fly Galapagos -> Quito', 700.00),

-- Bolivia
(1, 15, 'La Paz', 'Bolivia', -16.5000, -68.1500, 3, NULL, 30.00, NULL, 0, 40.00, 'Fly', 'Fly Quito -> La Paz', 500.00),
(1, 16, 'Copacabana, Lake Titicaca', 'Bolivia', -16.1667, -69.0864, 2, 'Hotel La Cupula', 54.00, NULL, 0, 30.00, 'Bus', 'Bus La Paz -> Copacabana', 20.00),
(1, 17, 'Isla del Sol', 'Bolivia', -16.0333, -69.1833, 4, 'Utasawa', 52.00, NULL, 0, 30.00, 'Boat', 'Boat Copacabana -> Isla del Sol. Bus -> La Paz', 30.00),
(1, 18, 'Rurrenabaque', 'Bolivia', -14.4375, -67.5281, 3, NULL, 0.00, 'Amazon Lodge (Price includes lodge, food, tour)', 800.00, 10.00, 'Fly', 'Fly La Paz -> Rurrenabaque. Fly Rurrenabaque -> La Paz', 400.00),
(1, 19, 'Cochabamba', 'Bolivia', -17.3895, -66.1568, 2, NULL, 20.00, 'Parque Torotoro', 60.00, 20.00, 'Bus', 'Bus La Paz -> Cochabamba', 40.00),
(1, 20, 'Santa Cruz de la Sierra', 'Bolivia', -17.8146, -63.1561, 2, NULL, 30.00, 'Vineyards', 0, 40.00, 'Fly', 'Fly Cochabamba -> Santa Cruz', 150.00),
(1, 21, 'Sucre', 'Bolivia', -19.0196, -65.2619, 1, NULL, 25.00, NULL, 0, 30.00, 'Bus', 'Overnight Bus Santa Cruz -> Sucre', 40.00),
(1, 22, 'Uyuni', 'Bolivia', -20.4597, -66.8250, 3, 'Salt Hotel', 100.00, 'Salt Flats + Stargazing', 400.00, 30.00, 'Bus', 'Overnight Bus Sucre -> Uyuni', 30.00),

-- Chile
(1, 23, 'San Pedro de Atacama', 'Chile', -22.9083, -68.1992, 3, NULL, 50.00, 'Desert tours', 300.00, 40.00, 'Bus', 'Bus Uyuni -> San Pedro', 60.00),
(1, 24, 'Valparaiso', 'Chile', -33.0472, -71.6127, 2, NULL, 50.00, NULL, 0, 50.00, 'Bus', 'Bus Mendoza -> Valparaiso', 80.00),
(1, 25, 'Santiago', 'Chile', -33.4489, -70.6693, 3, NULL, 80.00, NULL, 0, 0, 'Bus', 'Bus Valparaiso -> Santiago', 30.00),
(1, 26, 'Torres Del Paine', 'Chile', -51.0000, -73.0000, 5, NULL, 0.00, 'W Trek', 1200.00, 0, 'Trek', 'Multi-day trek', 0.00),

-- Argentina
(1, 27, 'Salta', 'Argentina', -24.7859, -65.4117, 2, NULL, 0.00, 'Rent Car to Mendoza', 900.00, 30.00, 'Bus', 'Bus San Pedro -> Salta', 80.00),
(1, 28, 'Cafayate', 'Argentina', -26.0739, -65.9753, 1, NULL, 40.00, 'Drive', 0, 30.00, 'Drive', 'Driving tour', 50.00),
(1, 29, 'Mendoza', 'Argentina', -32.8908, -68.8272, 3, NULL, 40.00, 'Vineyards', 100.00, 60.00, 'Drive', 'Continue driving', 50.00),
(1, 30, 'Bariloche', 'Argentina', -41.1335, -71.3103, 3, NULL, 0.00, NULL, 0, 0, 'Fly', 'Fly Santiago -> Bariloche', 300.00),
(1, 31, 'El Calafate', 'Argentina', -50.3374, -72.2647, 2, NULL, 0.00, 'Perito Moreno Glacier', 0, 0, 'Fly', 'Fly Bariloche -> El Calafate', 300.00),
(1, 32, 'Puerto Natales', 'Chile', -51.7333, -72.5167, 1, NULL, 0.00, NULL, 0, 0, 'Bus', 'Bus El Calafate -> Puerto Natales', 60.00),
(1, 33, 'Ushuaia', 'Argentina', -54.8019, -68.3030, 3, NULL, 0.00, 'Boat trip', 0, 0, 'Bus', 'Bus Puerto Natales -> Ushuaia', 100.00),
(1, 34, 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 2, NULL, 0.00, 'Initial Stay', 0, 0, 'Fly', 'Fly Ushuaia -> Buenos Aires', 400.00),
(1, 35, 'Iguazu Falls', 'Argentina', -25.6953, -54.4367, 3, NULL, 40.00, 'Waterfalls', 100.00, 40.00, 'Fly', 'Fly Buenos Aires -> Iguazu Falls', 300.00),
(1, 36, 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 2, NULL, 50.00, NULL, 0, 60.00, 'Fly', 'Fly Iguazu Falls -> Buenos Aires (Return cost)', 0.00),
(1, 37, 'San Antonio de Areco', 'Argentina', -34.2500, -59.4667, 1, NULL, 100.00, NULL, 0, 30.00, 'Bus', 'Bus Buenos Aires -> San Antonio', 20.00),
(1, 38, 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 1, NULL, 50.00, NULL, 0, 0, 'Bus', 'Bus San Antonio -> Buenos Aires', 20.00);

-- Initialize progress tracking
INSERT INTO progress (trip_id, current_location_id, current_day, total_days, locations_visited, total_locations, total_spent, total_planned)
SELECT 
    1,
    NULL, -- No current location yet (trip hasn't started)
    0,
    (SELECT COALESCE(SUM(nights), 0) FROM locations WHERE trip_id = 1) as total_days,
    0,
    (SELECT COUNT(*) FROM locations WHERE trip_id = 1) as total_locations,
    0.00,
    (SELECT COALESCE(
        SUM(
            COALESCE(accommodation_cost_planned, 0) + 
            COALESCE(activities_cost_planned, 0) + 
            COALESCE(food_drink_cost_planned * nights, 0) + 
            COALESCE(travel_cost_planned, 0)
        ), 0
    ) FROM locations WHERE trip_id = 1) as total_planned;

-- Add a sample blog post
INSERT INTO blog_posts (trip_id, location_id, title, content, published, published_date) VALUES
(1, NULL, 'Planning Our South American Adventure', 
'<p>After months of planning, we''re finally ready to embark on our 6-month journey through South America! 🌎</p><p>Our route will take us through Peru, Ecuador, Bolivia, Chile, and Argentina - covering everything from the Amazon rainforest to Patagonian glaciers, from the Galapagos Islands to the salt flats of Uyuni.</p><p>Key highlights we''re most excited about:</p><ul><li>Hiking the Inca Trail to Machu Picchu</li><li>Exploring the Galapagos Islands</li><li>Trekking Torres del Paine W Circuit</li><li>Experiencing the Uyuni Salt Flats</li><li>Wine tasting in Mendoza</li><li>Visiting Iguazu Falls</li></ul><p>Follow along as we share our adventures, tips, and experiences!</p>', 
1, datetime('now'));
