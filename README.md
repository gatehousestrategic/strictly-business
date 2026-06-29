# Strictly Business — Community Referral Directory

Searchable referral database built on Supabase + deployed as a static site on Render.

---

## Stack

- **Frontend:** Single HTML file, no framework, no build step
- **Database:** Supabase (Postgres)
- **Hosting:** Render (Static Site)
- **Domain:** sb.gatehousestrategic.com

---

## Setup: Step by Step

### 1. Supabase — Create the table

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor**
3. Paste the contents of `setup.sql` and click **Run**

### 2. Import the data

1. In Supabase, go to **Table Editor → recommendations**
2. Click **Import data** (CSV icon in the top right)
3. Upload `recommendations_categorized.csv`
4. Map columns: name → name, service → service, category → category, contact → contact, notes → notes, date_added → date_added
5. Click Import — all 2,275 records will load

### 3. Deploy to Render

1. Push this entire folder to a GitHub repo named `strictly-business`
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git remote add origin https://github.com/YOUR_USERNAME/strictly-business.git
   git push -u origin main
   ```

2. Go to [render.com](https://render.com) → **New → Static Site**
3. Connect your GitHub repo
4. Settings:
   - **Name:** strictly-business
   - **Branch:** main
   - **Publish directory:** `.`
   - Leave build command empty
5. Click **Create Static Site**

### 4. Add custom domain

1. In Render → your site → **Settings → Custom Domains**
2. Add `sb.gatehousestrategic.com`
3. Render will show you a CNAME record to add in your DNS
4. In your domain registrar (wherever gatehousestrategic.com DNS lives), add:
   - Type: `CNAME`
   - Name: `sb`
   - Value: `[your-render-app].onrender.com`
5. SSL is automatic — takes 5–10 minutes to activate

---

## Adding new referrals

- Use the **+ Add Referral** button in the app — saves directly to Supabase
- Or import another CSV batch through the Supabase dashboard

## Updating data

Re-upload a new CSV through Supabase Table Editor anytime.

---

## Features

- 🔍 Live full-text search
- 🏷️ Filter by category (40+ trades & industries)
- 📅 Filter by date range
- 🔃 Sort by name, date, or category
- ➕ Add new referrals directly from the app
- 📱 Mobile responsive
- ✨ Animated loading screen
