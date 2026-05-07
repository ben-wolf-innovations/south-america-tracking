# Sharing the Trip Tracker on Your Local Network

This lets your partner access the app from her Mac while both of you are on the same Wi-Fi.

---

## Step 1 — Find your Windows IP address

Open PowerShell and run:

```powershell
ipconfig
```

Look for the **IPv4 Address** under your active network adapter (usually labelled "Wi-Fi"). It will look like `192.168.x.x`. Note it down.

---

## Step 2 — Create the frontend .env file

In VS Code, create a new file at:

```
south-america-tracking/client/.env
```

Add this content, replacing `192.168.x.x` with your actual IP from Step 1:

```
VITE_API_URL=http://192.168.x.x:3000/api
VITE_ENV=development
```

---

## Step 3 — Update Vite to accept connections from other devices

Open `client/vite.config.js` and update it to:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true
  }
})
```

The `host: '0.0.0.0'` line is what allows other devices on the network to connect.

---

## Step 4 — Allow the ports through Windows Firewall

Open PowerShell **as Administrator** and run both commands:

```powershell
New-NetFirewallRule -DisplayName "Trip Tracker Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "Trip Tracker Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

## Step 5 — Start both servers

In your project folder, start the backend:

```powershell
cd server
npm run dev
```

In a second terminal, start the frontend:

```powershell
cd client
npm run dev
```

---

## Step 6 — Your partner opens it on her Mac

She opens Safari or Chrome and goes to:

```
http://192.168.x.x:5173
```

(Replace `192.168.x.x` with your IP from Step 1.)

She can log in with the family PIN **5678** for read access, or admin PIN **1234** to edit data.

---

## Notes

- Both devices must be on the **same Wi-Fi network**
- Your Windows machine must be **on and running both servers** for her to access it
- If it stops working after a router restart, your IP may have changed — re-check Step 1
- To give her a stable bookmark, you can set a **static IP** for your machine in your router's DHCP settings (search your router model + "static IP / DHCP reservation")

---

## To revert (back to local-only access)

Delete or comment out the `client/.env` file contents and remove the `host: '0.0.0.0'` line from `vite.config.js`.
