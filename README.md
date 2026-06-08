# Sadhana Tracker

A shared Atma Kriya and daily sadhana tracker with multi-user progress visibility and push notifications.

Built with a **woodcut-inspired design system** — bold borders, halftone textures, serif headlines.

## Features

- **Daily practice** — Atma Kriya techniques (12 items), Japa meditation timer (60 min goal), and quick logs (Exercise, Water, Study, Abhishekam)
- **Multi-user accounts** — register, log in, track your own progress
- **Sangha visibility** — see everyone's completion for the day with per-item breakdown
- **Streak tracking** — current streak, longest streak, monthly calendar heatmap
- **Push notifications** — daily reminders on your phone via PWA
- **Installable** — add to your phone's home screen as a PWA

## Quick Start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Set environment variables in server/.env
#    TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET, VAPID keys

# 3. Build the frontend
cd ../client && npx vite build

# 4. Start the server
cd ../server && node index.js
```

Then open **http://localhost:3001** in your browser.

## Development

```bash
# Terminal 1 — API server
cd server && node index.js

# Terminal 2 — Vite dev server with hot reload
cd client && npx vite
```

Then open **http://localhost:5173** (dev server proxies API calls to :3001).

## Sadhana Day

Practice days roll over at **4:30 AM**, not midnight. Progress, streaks, and timers all use this boundary.

## Push Notifications

VAPID keys are configured in `server/.env`. To regenerate:

```bash
cd server && npx web-push generate-vapid-keys
```

Push notifications require HTTPS in production — they work on `localhost` during development.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, woodcut design system
- **Backend:** Express, Turso (libSQL), JWT auth
- **PWA:** Service Worker, Web Push API, manifest.json
- **Design:** Woodcut BW — bold monochrome with red accents, Libre Caslon + JetBrains Mono
