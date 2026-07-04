# GIMK Portal Deployment Guide

This guide describes how to run and deploy the **GIMK Portal** application locally, to GitHub, and to cloud hosting providers including **Cloudflare** and container/VPS platforms.

---

## 🏗️ Application Architecture

The GIMK Portal is a modern full-stack application built using:
- **Frontend**: React 19, Tailwind CSS, Lucide Icons, and Motion animations (Vite)
- **Backend**: Express Server (Node.js/TypeScript)
- **Database**: SQLite (`church.db`)
- **AI Services**: Google Gemini API via `@google/genai` (rate-limit protected with automated caching & offline fallbacks)

---

## 📦 Option 1: Full-Stack Container / VPS Deployment (Highly Recommended)

Because this app utilizes a local SQLite database for reliable persistent storage, the simplest and most performant way to deploy it is as a **single, self-contained container or Node.js service** on platforms like **Railway, Render, Fly.io, or DigitalOcean**.

Our build system is fully optimized for this:
1. Run `npm run build` — this builds the React frontend static assets (`dist/`) and bundles the TypeScript backend server into a single, optimized file (`dist/server.cjs`).
2. Run `npm start` — this starts the production server on port `3000`, which serves the React app statically and hosts all API routes on `/api/*`.

### Step-by-step for Render / Railway / Fly.io:
1. Push your repository to **GitHub**.
2. Create a new Web Service on your hosting provider connected to your GitHub repo.
3. Configure the build commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Set the following environment variables:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
5. Ensure a persistent disk volume is mounted at the root directory if you want your `church.db` SQLite file to persist across server restarts (alternatively, see Cloudflare D1 below).

---

## ⚡ Option 2: Split Cloudflare Pages (Frontend) + Render + Neon/Supabase (Backend) - 100% Free & Card-Free

For the ultimate free, high-performance hosting combination, you can split your deployment:
- **Frontend**: Hosted on **Cloudflare Pages** (blazing-fast, global edge CDN with a generous, card-free free tier).
- **Backend & Database**: Express backend hosted on **Render** connected to a free **Neon** or **Supabase** PostgreSQL database (fully card-free persistent tier).

---

### 📦 Step 1: Set Up Your Free PostgreSQL Database (Neon or Supabase)

Since Render's free Web Services do not include persistent disks (meaning a local SQLite database would get wiped on restarts), we have adapted our backend to support PostgreSQL seamlessly.

1. Create a free account on **Neon** (https://neon.tech) or **Supabase** (https://supabase.com). Neither requires a credit card for their free tier!
2. Create a new project and select **PostgreSQL**.
3. Copy your database connection string (it will look like `postgresql://username:password@hostname/dbname?sslmode=require`).

---

### 🚀 Step 2: Deploy the Express Backend to Render

You have already successfully initialized the backend service on Render! To ensure your data is permanently persisted on your Postgres database:

1. Go to your **Render Dashboard** (https://dashboard.render.com).
2. Select your Web Service (`gim-church`).
3. Navigate to **Environment** (or **Environment Variables**).
4. Add the following environment variables:
   - `DATABASE_URL`: *(Your Neon or Supabase connection string)*
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
   - `NODE_ENV`: `production`
5. Click **Save Changes**. Render will automatically redeploy. On start, the backend will detect `DATABASE_URL`, connect to your cloud PostgreSQL database, and automatically run schemas and insert initial seed values!

---

### ⚡ Step 3: Deploy the React Frontend to Cloudflare Pages

#### 1. Configure the Frontend Build
During the Cloudflare Pages build process, Cloudflare needs to know where your Render backend is located.

1. Go to the **Cloudflare Dashboard**.
2. Go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository.
4. Set the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
5. Under **Environment variables**, click **Add variable** and set:
   - Name: `VITE_API_URL`
   - Value: `https://gim-church.onrender.com` *(your Render backend URL)*
6. Click **Save and Deploy**.

#### 2. Setup Automatic Deployments (Optional CI/CD)
To automate this, we pre-configured a GitHub Actions file at `.github/workflows/deploy.yml`. 
Just add your `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Settings -> Secrets, and every git push will deploy your updated frontend to Pages!

---

## ☁️ Option 3: Pure Serverless Cloudflare Deployment (Pages Functions + D1 Database)

If you wish to host the entire fullstack app inside the Cloudflare Serverless ecosystem:

### 1. Database (SQLite to Cloudflare D1)
Cloudflare doesn't support local filesystem SQLite writes in serverless Workers. Instead, Cloudflare provides **D1**, a serverless SQL database powered by SQLite.
1. Create a D1 database in your Cloudflare dashboard:
   ```bash
   npx wrangler d1 create gimk-db
   ```
2. Export your local database schema/seed SQL statements (defined in `server/db.ts`) and execute them on D1:
   ```bash
   npx wrangler d1 execute gimk-db --file=./schema.sql
   ```

### 2. Backend (Express to Pages Functions)
To run your API routes on Cloudflare Pages without a Node.js VPS, translate the Express handlers in `server.ts` into Cloudflare Pages Functions located in a `/functions` folder in your repository root, or configure a serverless wrapper like `@vendia/serverless-express` or `hono`.

---

## 🚀 GitHub Actions Continuous Deployment (CI/CD)

We have pre-configured a GitHub Actions workflow inside `.github/workflows/deploy.yml` that automatically deploys the frontend React app to Cloudflare Pages on every push to the `main` branch.

### How to set it up:
1. In your GitHub Repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following **Repository Secrets**:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token (with Pages edit permissions).
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on the Cloudflare dashboard homepage).
3. Every time you push changes to `main`, GitHub will compile your React app and deploy it directly to Cloudflare Pages!

---

## 🔒 Security Best Practices
- **Never commit real credentials**: Ensure your `church.db` file and `.env` files are ignored in `.gitignore` (pre-configured).
- **Backend Protection**: Keep your `GEMINI_API_KEY` hidden server-side. Our Express server handles all API queries securely so that the key is never exposed to the client browser.
