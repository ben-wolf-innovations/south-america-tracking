# 🚀 Deployment Steps - Azure Functions & Static Web App

## ✅ What You've Already Done

1. ✅ Resource Group: `south-america-trip-rg`
2. ✅ Storage Account: `southamericatrip`
3. ✅ Database uploaded: `database/trip.db` (56 locations verified)
4. ✅ Function App created: `south-america-trip-api`
5. ✅ Static Web App created: `south-america-app`
6. ✅ GitHub repo connected to Static Web App

## 📋 Next Steps

### Step 1: Configure Function App Settings

Go to Azure Portal → Function App → `south-america-trip-api` → Configuration → Application Settings

**Add these 3 settings:**

1. **AZURE_STORAGE_CONNECTION_STRING**
   ```
   DefaultEndpointsProtocol=https;AccountName=southamericatrip;AccountKey=Rdxi0gGFIVUpsPjR8NqVYC0r2yKVaf0JbWWB75OVwlaerI4Wq7vIiu5kkKS41R+sspKs43wzNjcS+AStNeUVig==;EndpointSuffix=core.windows.net
   ```

2. **JWT_SECRET**
   ```
   ft5Ompw29jM8DiHhn1Z3oqSCzQ4lNd0APaI7EbxBTgJuKYL6
   ```

3. **WEBSITE_NODE_DEFAULT_VERSION**
   ```
   ~20
   ```

**Click "Save" at the top**, then "Continue" to restart the app.

---

### Step 2: Deploy Function App

**Option A: Using VS Code (Easiest)**

1. Install Azure Functions extension in VS Code
2. Click Azure icon in left sidebar
3. Find your Function App: `south-america-trip-api`
4. Right-click → "Deploy to Function App"
5. Select the `api` folder when prompted

**Option B: Using PowerShell**

```powershell
cd api
func azure functionapp publish south-america-trip-api
```

---

### Step 3: Get Function App URL

After deployment completes, your API will be at:
```
https://south-america-trip-api.azurewebsites.net
```

**Test it:**
```powershell
$response = Invoke-RestMethod `
  -Uri "https://south-america-trip-api.azurewebsites.net/api/auth/login" `
  -Method POST `
  -Body '{"pin":"1234"}' `
  -ContentType "application/json"

Write-Host "Token: $($response.token)"
```

---

### Step 4: Configure CORS (Function App)

Go to Azure Portal → Function App → `south-america-trip-api` → CORS

**Add your Static Web App URL:**

1. Get your Static Web App URL from Azure Portal → Static Web App → `south-america-app` → Overview
   - It will be something like: `https://gentle-ocean-xyz.azurestaticapps.net`

2. Add that URL to CORS Allowed Origins (remove `*` if present)

3. Click "Save"

---

### Step 5: Update Frontend Environment Variable

**In Azure Portal:**

1. Go to Static Web App → `south-america-app` → Configuration
2. Add Application Setting:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://south-america-trip-api.azurewebsites.net/api`
3. Click "Save"

---

### Step 6: Update Local Client .env.production (for future builds)

Create `client/.env.production`:

```env
VITE_API_URL=https://south-america-trip-api.azurewebsites.net/api
VITE_ENV=production
```

---

### Step 7: Test Full Deployment

1. Visit your Static Web App URL
2. Login with PIN: `1234` (admin) or `5678` (family)
3. Test all features:
   - ✅ Overview page loads
   - ✅ Map displays locations
   - ✅ Locations list works
   - ✅ Costs tracking works
   - ✅ Blog works
   - ✅ Packing list works
   - ✅ Useful info shows exchange rates

---

## 🔍 Troubleshooting

### Function App Issues

**Check logs:**
- Azure Portal → Function App → Log Stream

**Common issues:**
- ❌ "Cannot find module" → Redeploy with `func azure functionapp publish`
- ❌ Database not loading → Check AZURE_STORAGE_CONNECTION_STRING in Configuration
- ❌ 401 errors → Check JWT_SECRET is set correctly

### Static Web App Issues

**Check build logs:**
- Azure Portal → Static Web App → Deployment History

**Common issues:**
- ❌ API calls fail → Check VITE_API_URL environment variable
- ❌ CORS errors → Verify Static Web App URL is in Function App CORS settings
- ❌ 404 on refresh → Check `staticwebapp.config.json` is deployed

---

## 📊 Monitoring & Costs

### Expected Costs (FREE Tier Limits)

- **Function App (Consumption):** 1M executions/month FREE
- **Storage Account:** 5 GB FREE
- **Static Web App:** 100 GB bandwidth/month FREE
- **Database:** 110 KB (negligible)

### Monitor Usage

- Azure Portal → Cost Management + Billing → Cost Analysis
- Set budget alert at £1/month to be safe

---

## 🎯 Quick Reference

| Resource | Name | URL |
|----------|------|-----|
| Resource Group | `south-america-trip-rg` | - |
| Storage Account | `southamericatrip` | - |
| Function App | `south-america-trip-api` | https://south-america-trip-api.azurewebsites.net |
| Static Web App | `south-america-app` | Check Azure Portal |

**Admin PIN:** 1234  
**Family PIN:** 5678  
**JWT Secret:** ft5Ompw29jM8DiHhn1Z3oqSCzQ4lNd0APaI7EbxBTgJuKYL6

---

## ✅ Deployment Checklist

- [ ] Function App settings configured (3 settings)
- [ ] Function App deployed (via VS Code or CLI)
- [ ] Function App URL tested with login endpoint
- [ ] CORS configured with Static Web App URL
- [ ] Static Web App environment variable set (VITE_API_URL)
- [ ] Static Web App tested end-to-end
- [ ] All pages working (Overview, Map, Locations, Costs, Blog, Packing, Info)
- [ ] Both PINs tested (admin and family access)

---

## 🚨 Important Notes

1. **Local Development:** Keep using `http://localhost:7071/api` (already configured in `.env`)
2. **Production:** Uses `https://south-america-trip-api.azurewebsites.net/api` (configured in Static Web App)
3. **Database Updates:** Run `npm run upload-db` in `api` folder to update production database
4. **Redeploy Backend:** `func azure functionapp publish south-america-trip-api` from `api` folder
5. **Redeploy Frontend:** Push to GitHub main branch (auto-deploys via GitHub Actions)

---

Need help? Check the logs in Azure Portal or run the test commands above!
