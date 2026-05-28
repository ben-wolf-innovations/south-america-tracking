# Test Azure Deployment
# Run this script after deploying to verify everything works

$baseUrl = "https://south-america-trip-api-b5b0b2bgc0cxhmb7.uksouth-01.azurewebsites.net"

Write-Host "🧪 Testing Azure Function App Deployment" -ForegroundColor Cyan
Write-Host "API URL: $apiUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Health check
Write-Host "Test 1: Checking if Function App is online..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/login" -Method OPTIONS -TimeoutSec 10
    Write-Host "✅ Function App is online (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Function App is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check Azure Portal → Function App → Overview for deployment status" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Login with Admin PIN
Write-Host "Test 2: Testing admin login (PIN: 1234)..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$apiUrl/api/auth/login" `
        -Method POST `
        -Body '{"pin":"1234"}' `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Admin login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Admin login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check JWT_SECRET in Function App Configuration" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 3: Get locations
Write-Host "Test 3: Fetching locations..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $locations = Invoke-RestMethod `
        -Uri "$apiUrl/api/locations?trip_id=1" `
        -Method GET `
        -Headers $headers
    
    $count = $locations.data.Count
    Write-Host "✅ Retrieved $count locations" -ForegroundColor Green
    
    if ($count -gt 0) {
        $first = $locations.data[0]
        Write-Host "   Sample: $($first.name), $($first.country)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to fetch locations" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check AZURE_STORAGE_CONNECTION_STRING in Function App Configuration" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 4: Get trip info
Write-Host "Test 4: Fetching trip information..." -ForegroundColor Yellow
try {
    $trip = Invoke-RestMethod `
        -Uri "$apiUrl/api/trips/1" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Trip: $($trip.data.name)" -ForegroundColor Green
    Write-Host "   Start: $($trip.data.start_date)" -ForegroundColor Gray
    Write-Host "   End: $($trip.data.end_date)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to fetch trip" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Get cost summary
Write-Host "Test 5: Fetching cost summary..." -ForegroundColor Yellow
try {
    $costs = Invoke-RestMethod `
        -Uri "$apiUrl/api/costs/summary?trip_id=1" `
        -Method GET `
        -Headers $headers
    
    $total = $costs.data.location_budgets.total_planned
    $categories = $costs.data.by_category.Count
    $countries = $costs.data.by_country.Count
    
    Write-Host "✅ Cost summary loaded" -ForegroundColor Green
    Write-Host "   Total planned: £$total" -ForegroundColor Gray
    Write-Host "   Categories: $categories" -ForegroundColor Gray
    Write-Host "   Countries: $countries" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to fetch cost summary" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Test Family PIN
Write-Host "Test 6: Testing family login (PIN: 5678)..." -ForegroundColor Yellow
try {
    $familyResponse = Invoke-RestMethod `
        -Uri "$apiUrl/api/auth/login" `
        -Method POST `
        -Body '{"pin":"5678"}' `
        -ContentType "application/json"
    
    Write-Host "✅ Family login successful" -ForegroundColor Green
    Write-Host "   Access Level: $($familyResponse.accessLevel)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Family login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 All API tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Get your Static Web App URL from Azure Portal" -ForegroundColor White
Write-Host "2. Add that URL to Function App CORS settings" -ForegroundColor White
Write-Host "3. Add VITE_API_URL to Static Web App configuration" -ForegroundColor White
Write-Host "4. Visit your Static Web App URL and test the frontend" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
