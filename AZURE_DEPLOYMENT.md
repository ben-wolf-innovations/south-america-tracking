# Azure Deployment Guide

## Prerequisites

1. **Azure Account** - Free tier includes:
   - 1 million free Azure Functions executions/month
   - 5 GB free Blob Storage
   - Perfect for this personal project

2. **Azure CLI** - Install from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

3. **Azure Functions Core Tools** - Already installed (v4.11.0+)

## Step 1: Create Azure Resources

### Login to Azure
```powershell
az login
```

### Create Resource Group
```powershell
az group create `
  --name south-america-trip-rg `
  --location westus2
```

### Create Storage Account
```powershell
az storage account create `
  --name sawolfinnovations `
  --resource-group south-america-trip-rg `
  --location westus2 `
  --sku Standard_LRS `
  --kind StorageV2
```

### Get Storage Connection String
```powershell
$storageConnection = az storage account show-connection-string `
  --name sawolfinnovations `
  --resource-group south-america-trip-rg `
  --query connectionString `
  --output tsv

Write-Host "Connection String: $storageConnection"
```

### Create Blob Container
```powershell
az storage container create `
  --name database `
  --connection-string $storageConnection
```

### Upload Database
```powershell
cd api
$env:AZURE_STORAGE_CONNECTION_STRING = $storageConnection
npm run upload-db
```

## Step 2: Create Function App

### Create Function App (Consumption Plan - FREE)
```powershell
az functionapp create `
  --resource-group south-america-trip-rg `
  --consumption-plan-location westus2 `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --name south-america-trip-api `
  --storage-account sawolfinnovations `
  --os-type Windows
```

### Configure App Settings
```powershell
# Generate a secure JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

az functionapp config appsettings set `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg `
  --settings `
    AZURE_STORAGE_CONNECTION_STRING="$storageConnection" `
    JWT_SECRET="$jwtSecret" `
    WEBSITE_NODE_DEFAULT_VERSION="~20"
```

## Step 3: Deploy Function App

### Option A: VS Code Extension (Recommended)
1. Install Azure Functions extension
2. Open `api` folder in VS Code
3. Click Azure icon in sidebar
4. Right-click Function App → Deploy to Function App
5. Select `south-america-trip-api`

### Option B: Azure CLI
```powershell
cd api
func azure functionapp publish south-america-trip-api
```

### Option C: GitHub Actions (CI/CD)
See section below for automated deployment.

## Step 4: Create Static Web App (Frontend)

### Create Static Web App (FREE tier)
```powershell
az staticwebapp create `
  --name south-america-trip `
  --resource-group south-america-trip-rg `
  --location westus2 `
  --source https://github.com/YOUR_USERNAME/south-america-tracking `
  --branch main `
  --app-location "/client" `
  --output-location "dist" `
  --sku Free
```

### Get Static Web App URL
```powershell
az staticwebapp show `
  --name south-america-trip `
  --resource-group south-america-trip-rg `
  --query defaultHostname `
  --output tsv
```

### Configure API Environment Variable
```powershell
# Get Function App URL
$apiUrl = az functionapp show `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg `
  --query defaultHostName `
  --output tsv

# Update client/.env for production
Write-Host "VITE_API_URL=https://$apiUrl/api"
```

## Step 5: Configure CORS

### Allow Static Web App to call Function App
```powershell
$staticAppUrl = az staticwebapp show `
  --name south-america-trip `
  --resource-group south-america-trip-rg `
  --query defaultHostname `
  --output tsv

az functionapp cors add `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg `
  --allowed-origins "https://$staticAppUrl"
```

## GitHub Actions CI/CD (Optional)

### Create `.github/workflows/azure-deploy.yml`
```yaml
name: Deploy to Azure

on:
  push:
    branches:
      - main

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd api
          npm install
      
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: south-america-trip-api
          package: ./api
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/client"
          output_location: "dist"
```

### Get Publish Profiles
```powershell
# Get Function App publish profile
az functionapp deployment list-publishing-profiles `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg `
  --xml

# Get Static Web App deployment token
az staticwebapp secrets list `
  --name south-america-trip `
  --resource-group south-america-trip-rg `
  --query properties.apiKey `
  --output tsv
```

Add these as GitHub Secrets:
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Verify Deployment

### Test API Endpoints
```powershell
$apiUrl = "https://south-america-trip-api.azurewebsites.net"

# Test login
$response = Invoke-RestMethod `
  -Uri "$apiUrl/api/auth/login" `
  -Method POST `
  -Body '{"pin":"1234"}' `
  -ContentType "application/json"

$token = $response.token

# Test locations
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod `
  -Uri "$apiUrl/api/locations?trip_id=1" `
  -Headers $headers
```

### Test Frontend
Visit your Static Web App URL and login with PIN 1234 or 5678.

## Monitoring & Costs

### View Function App Logs
```powershell
az functionapp log tail `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg
```

### Check Usage (FREE tier limits)
```powershell
# Storage usage
az storage account show-usage `
  --location westus2

# Function executions (view in Azure Portal)
# Portal → Function App → Monitor → Application Insights
```

### Expected Monthly Costs: $0.00
- Storage: <5 MB = FREE (5 GB included)
- Functions: <1M executions = FREE (1M included)
- Static Web App: FREE tier
- Bandwidth: Minimal = FREE (5 GB included)

## Troubleshooting

### Function App not starting
```powershell
# Check app settings
az functionapp config appsettings list `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg

# View logs
az functionapp log tail `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg
```

### Database not loading
```powershell
# Verify blob exists
az storage blob list `
  --container-name database `
  --connection-string $storageConnection

# Re-upload if needed
cd api
npm run upload-db
```

### CORS errors
```powershell
# Check CORS settings
az functionapp cors show `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg

# Add origin
az functionapp cors add `
  --name south-america-trip-api `
  --resource-group south-america-trip-rg `
  --allowed-origins "https://your-frontend-url.azurestaticapps.net"
```

## Cleanup (If Needed)

### Delete all resources
```powershell
az group delete `
  --name south-america-trip-rg `
  --yes
```

## Next Steps

1. Set up custom domain (optional)
2. Enable Application Insights for monitoring
3. Configure backup retention for blob storage
4. Set up alerts for function failures

---

**Note**: Keep your JWT_SECRET and storage connection strings secure. Never commit local.settings.json to git.
