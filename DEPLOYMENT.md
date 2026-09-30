# Deployment Guide for QuickHire AI

This document outlines the deployment architecture, required environment variables, and step-by-step instructions for deploying QuickHire AI to production using Render, Vercel, and MongoDB Atlas.

## Architecture
- **Frontend (Vercel):** React + Vite. Deployed as a static SPA. Includes a rewrite rule for all routes to `/` to support client-side routing.
- **Backend (Render):** Node.js Express server. Hosts API endpoints and serves as a proxy to third-party services (Gemini API, OneCompiler, etc.).
- **Database (MongoDB Atlas):** Hosted MongoDB cluster.
- **Code Execution:** Relies on OneCompiler for secure, cloud-hosted code execution in production instead of local Judge0 Docker containers.

## Environment Variables

### Backend (Render)

| Variable | Required? | Description |
|---|---|---|
| `NODE_ENV` | Yes | Must be set to `production` |
| `NODE_VERSION` | Yes | Must be `20` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed domains (e.g., `https://quick-hire-ai.vercel.app`) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Long, secure random string for signing JWT tokens |
| `GEMINI_API_KEY` | Yes | Google Gemini API Key |
| `CODE_EXECUTION_ENABLED` | Yes | Set to `true` |
| `CODE_EXECUTION_PROVIDER` | Yes | Set to `onecompiler` |
| `ONECOMPILER_API_KEY` | Yes | API Key for OneCompiler |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `FROM` | Yes | Email credentials (e.g., Gmail SMTP) |

### Frontend (Vercel)

| Variable | Required? | Description |
|---|---|---|
| `VITE_API_URL` | Yes | The URL of the Render backend (e.g., `https://quickhireai.onrender.com`) |

---

## Step-by-step Deploy Instructions

### 1. MongoDB Atlas Configuration
1. Go to your MongoDB Atlas dashboard.
2. In **Network Access**, ensure that the IP addresses of your Render service are allowed. (Or temporarily allow `0.0.0.0/0` if Render's IPs are dynamic/unknown, but restrict it later).
3. Copy your Connection String (`MONGODB_URI`).

### 2. Backend Deploy (Render)
1. Go to your Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repository. Render will automatically read the `render.yaml` file.
4. Render will prompt you for the "sync: false" secrets (`MONGODB_URI`, `JWT_SECRET`, etc.). Enter the production values.
5. Click **Apply**. Wait for the deploy to finish.
6. Verify the deploy by visiting `https://<your-render-url>/healthcheck`.

### 3. Frontend Deploy (Vercel)
1. Install the Vercel CLI: `npm i -g vercel` (if not already installed).
2. Open a terminal in the `Frontend` directory.
3. Run `npx vercel link` to connect the project to Vercel.
4. Go to the Vercel Dashboard -> Settings -> Environment Variables, and add `VITE_API_URL` pointing to your Render backend URL.
5. Run `npx vercel --prod` to deploy to production.
6. Once deployed, note the final Vercel domain.

### 4. Final Security Pass
1. Go back to Render Dashboard -> Environment.
2. Update the `ALLOWED_ORIGINS` variable to match your exact Vercel domain.
3. Save and wait for the backend to restart.

---

## Rollback Procedures

- **Render (Backend):** Go to the Render Dashboard -> Select Service -> **Events** tab -> Click on a previous successful deploy and select **Rollback to this deploy**.
- **Vercel (Frontend):** Go to the Vercel Dashboard -> Select Project -> **Deployments** tab -> Click the three dots next to a previous deployment -> **Promote to Production**.
- **MongoDB Atlas:** If data corruption occurs, go to the Atlas dashboard -> **Data Services** -> **Clusters** -> **Backup** -> **Restore**.

## Secret Rotation
If a secret (like `JWT_SECRET` or `GEMINI_API_KEY`) is compromised:
1. Generate a new secret.
2. Update the value in the Render Dashboard (Environment tab).
3. Manually trigger a deploy / restart in Render for the changes to take effect.
4. Users may need to log in again if the JWT secret was rotated.
