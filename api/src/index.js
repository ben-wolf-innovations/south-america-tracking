/**
 * Azure Functions v4 Programming Model
 * All functions are registered via app.http() calls in individual function files
 * This file is required but can be empty - function auto-discovery happens at startup
 */

// Import all function modules to register them
import './functions/auth.js'
import './functions/locations.js'
import './functions/costs.js'
import './functions/packing.js'
import './functions/progress.js'
import './functions/info.js'
import './functions/trips.js'
import './functions/blog.js'
