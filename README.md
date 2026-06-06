# Sadhana Tracker

A shared spiritual practice tracker with multi-user progress visibility and push notifications.

Built with the **Paper BW design system** — warm, book-like, beautifully typeset.

## Features

- **Daily checklist** — 12 default sadhana items (Japa, Kirtan, Śrīmad Bhāgavatam, Bhagavad Gītā, Meditation, Yoga, Sevā, Guru Pūjā, Maṅgala Ārati, Tulasī Pūjā, Prasādam, Study)
- **Multi-user accounts** — register, log in, track your own progress
- **Team visibility** — see everyone's completion for the day
- **Streak tracking** — visual heatmap, streak counter, completion rates
- **Push notifications** — daily reminders on your phone via PWA
- **Installable** — add to your phone's home screen as a PWA

## Quick Start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Build the frontend
cd ../client && npx vite build

# 3. Start the server
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

## Push Notifications

VAPID keys are included in `server/.env`. To regenerate:

```bash
cd server && npx web-push generate-vapid-keys
```

Update the `.env` file with the new keys. Push notifications require HTTPS in production — they work on `localhost` during development.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Paper BW design system
- **Backend:** Express, SQLite (better-sqlite3), JWT auth
- **PWA:** Service Worker, Web Push API, manifest.json
- **Design:** Paper BW — warm monochrome with serif typography