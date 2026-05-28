# South America Trip Tracker - Azure Functions API

Azure Functions v4 API backend for the South America trip tracking application. Migrated from Express to Azure Functions for free hosting on Azure.

## 🏗️ Architecture

- **Runtime**: Azure Functions v4 (Node.js)
- **Database**: SQLite via sql.js, stored in Azure Blob Storage
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Base URL**: `/api/`

## 📁 Project Structure

```
api/
├── src/
│   ├── functions/          # HTTP trigger functions
│   │   ├── auth.js         # Login & token verification
│   │   ├── locations.js    # CRUD for trip locations
│   │   ├── costs.js        # CRUD for trip costs
│   │   ├── packing.js      # Packing list management
│   │   ├── progress.js     # Trip progress tracking
│   │   ├── info.js         # Travel info & exchange rates
│   │   ├── trips.js        # Trip metadata
│   │   └── blog.js         # Blog posts
│   ├── shared/             # Shared utilities
│   │   ├── database.js     # Azure Blob Storage SQLite wrapper
│   │   └── auth.js         # JWT authentication middleware
│   └── index.js            # Functions entry point
├── scripts/
│   ├── upload-database.js  # Upload SQLite DB to Azure Blob
│   └── test-database.js    # Test database connection
├── host.json               # Azure Functions host config
├── local.settings.json     # Local environment variables (not in git)
├── package.json            # Dependencies
└── .funcignore             # Deployment exclusions
```

## 🚀 API Endpoints (30 total)

### Authentication (2)
- `POST /api/auth/login` - Login with PIN
- `POST /api/auth/verify` - Verify JWT token

### Locations (5)
- `GET /api/locations` - Get all locations (with estimated dates)
- `GET /api/locations/:id` - Get single location
- `POST /api/locations` - Create location (admin)
- `PUT /api/locations/:id` - Update location (admin)
- `DELETE /api/locations/:id` - Delete location (admin)

### Costs (5)
- `GET /api/costs` - Get costs with filters
- `GET /api/costs/summary` - Get cost summary (planned vs actual by category and country)
- `POST /api/costs` - Create cost (admin)
- `PUT /api/costs/:id` - Update cost (admin)
- `DELETE /api/costs/:id` - Delete cost (admin)

### Packing (4)
- `GET /api/packing` - Get packing items (admin)
- `POST /api/packing` - Create packing item (admin)
- `PUT /api/packing/:id` - Update packing item (admin)
- `DELETE /api/packing/:id` - Soft delete packing item (admin)

### Progress (5)
- `GET /api/progress/stats` - Get trip statistics
- `GET /api/progress/current` - Get current location
- `POST /api/progress/checkin` - Check in to location (admin)
- `POST /api/progress/undo-last-visited` - Undo last check-in (admin)
- `POST /api/progress/clear-visited` - Clear all visited flags (admin)

### Info (1)
- `GET /api/info/exchange-rates` - Get live GBP exchange rates + travel info

### Trips (2)
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip (admin)

### Blog (6)
- `GET /api/blog` - Get blog posts (role-based filtering)
- `GET /api/blog/:id` - Get single blog post
- `POST /api/blog` - Create blog post (admin)
- `PUT /api/blog/:id` - Update blog post (admin)
- `DELETE /api/blog/:id` - Delete blog post (admin)
- `PUT /api/blog/:id/publish` - Toggle publish status (admin)

## 🔐 Authentication

Two access levels:
- **Admin** (PIN: `1234`) - Full access to all endpoints
- **Family** (PIN: `5678`) - Read-only access to published content

JWT tokens expire after 7 days.

### Example Login:
```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}'
```

Response:
```json
{
  "token": "eyJhbGci...",
  "user": { "accessLevel": "admin" },
  "expiresIn": "7d"
}
```

### Using the Token:
```bash
curl http://localhost:7071/api/locations \
  -H "Authorization: Bearer eyJhbGci..."
```

## 💾 Database Strategy

SQLite database stored in Azure Blob Storage:
- **Container**: `database`
- **Blob**: `trip.db`
- **Size**: 110KB (56 locations, 1 trip, 2 auth entries)

### How It Works

1. **Cold Start**: On first function invocation, database is downloaded from Azure Blob Storage into memory
2. **In-Memory Operations**: All queries run against in-memory SQLite database (fast performance)
3. **Automatic Persistence**: After write operations, changes are automatically uploaded back to blob storage
4. **Debouncing**: Uploads are debounced (max 1/second) to prevent excessive blob operations
5. **Lazy Loading**: Database is only initialized when first accessed

### Upload Database:
```bash
npm run upload-db
```

### Test Connection:
```bash
npm test
```

### Database Module API

```javascript
import { initDatabase, run, get, all, transaction } from './shared/database.js'

// Execute write operations (auto-saves)
const result = await run('INSERT INTO locations (name, country) VALUES (?, ?)', ['Lima', 'Peru'])

// Get single row
const location = await get('SELECT * FROM locations WHERE id = ?', [1])

// Get multiple rows
const locations = await all('SELECT * FROM locations ORDER BY sequence')

// Transaction (atomic operations)
await transaction(async (db) => {
  await db.run('UPDATE locations SET visited = 1 WHERE id = ?', [5])
  await db.run('INSERT INTO costs (location_id, amount) VALUES (?, ?)', [5, 50.00])
})
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools 4.x
- Azure Storage Account

### Setup
1. Install dependencies:
```bash
npm install
```

2. Create `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "AZURE_STORAGE_CONNECTION_STRING": "your-connection-string",
    "JWT_SECRET": "your-secret-key"
  },
  "Host": {
    "CORS": "*"
  }
}
```

3. Upload database to Azure Blob Storage:
```bash
npm run upload-db
```

4. Start the Functions runtime:
```bash
npm start
```

API will be available at `http://localhost:7071/api/`

## 📦 Dependencies

### Production
- `@azure/functions` - Azure Functions v4 SDK
- `@azure/storage-blob` - Azure Blob Storage client
- `sql.js` - SQLite compiled to WebAssembly
- `jsonwebtoken` - JWT token handling
- `bcryptjs` - Password hashing
- `node-fetch` - HTTP client for external APIs

### Development
- `azure-functions-core-tools` - Local development runtime

## 🌍 Environment Variables

### Required for Production:
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage connection string
- `JWT_SECRET` - Secret key for JWT signing (use strong random string)

### Optional:
- `FUNCTIONS_WORKER_RUNTIME=node` - Always set to "node"

## 📊 Database Schema

### Tables
- `trips` - Trip metadata (name, dates, status)
- `locations` - Trip stops with accommodation, travel, activities
- `costs` - Expense tracking
- `packing_items` - Packing list with budget tracking
- `blog_posts` - Blog entries for trip updates
- `auth` - User authentication (hashed PINs)

## 🧪 Testing

Test all endpoints locally before deployment:

```powershell
# Test database connection
npm test

# Test authentication
$response = Invoke-RestMethod -Uri "http://localhost:7071/api/auth/login" `
  -Method POST -Body '{"pin":"1234"}' -ContentType "application/json"
$token = $response.token

# Test locations with auth
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:7071/api/locations?trip_id=1" -Headers $headers
```

## 📝 Notes

- Database auto-saves after write operations
- Exchange rates cached for 30 minutes
- Token verification happens on every authenticated request
- Family users see only published blog posts
- Sequential check-in enforced (can't skip locations)

## 💰 Cost Considerations

**Azure Blob Storage (FREE tier):**
- Storage: <5 MB database = FREE (5 GB included)
- Operations: ~100-1000/day = FREE (20k reads + 10k writes/month included)

**Azure Functions (FREE tier):**
- 1M free executions/month
- 400k GB-s free compute/month

## 📄 License

Private project - South America Adventure 2026

**Estimated monthly operations:**
- Cold starts (download): ~100/day = 3,000/month
- Write operations (upload): ~50/day = 1,500/month
- **Total: ~4,500 operations/month = FREE** ✅

### Performance

- **Cold start penalty**: 1-2 seconds (download + load database)
- **Warm requests**: <50ms (in-memory SQLite)
- **Write operations**: <100ms (async upload, doesn't block response)

### Troubleshooting

**"AZURE_STORAGE_CONNECTION_STRING environment variable not set"**
- Check `local.settings.json` has the connection string
- For deployed functions, set the environment variable in Azure Portal

**"Database blob not found"**
- Upload the initial database file to blob storage (see setup steps above)
- Or let it create a new empty database automatically

**"Error downloading database"**
- Check storage account connection string is correct
- Verify the container name is `database` and blob name is `trip.db`
- Check Azure Storage firewall rules allow function access

## Migration from Express Backend

Key differences from the Express backend (`server/config/database.js`):

1. **Async Everything**: All database functions are now async (returns Promises)
2. **Auto-Save**: No need to manually call `saveDatabase()` after writes
3. **Initialization**: Database is lazily initialized on first access
4. **Connection String**: Uses Azure Storage connection string instead of file path

### Code Migration Pattern

**Before (Express):**
```javascript
import { run, get, all } from '../config/database.js'

const locations = all('SELECT * FROM locations') // Sync
```

**After (Azure Functions):**
```javascript
import { run, get, all } from '../shared/database.js'

const locations = await all('SELECT * FROM locations') // Async
```

Simply add `await` to all database calls!
