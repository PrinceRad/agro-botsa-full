# Agro-Botsa — Full Build (Backend Version)

This is the backup/full version — a real Express backend with server-side persistence,
built as a fallback in case the light (browser-only) build doesn't get finished in time.
Same three features: Weather, Diagnose, Activity Log.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and add your API keys:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   - `OPENWEATHER_API_KEY` — from https://openweathermap.org/api (free tier)
   - `PLANT_ID_API_KEY` — from https://www.kindwise.com or https://plant.id

   **Both are optional for testing.** Without keys, Weather and Diagnose return clearly
   labeled placeholder data instead of failing, so the app is fully clickable and
   demoable before real keys are added.

3. Run the server:
   ```bash
   npm start
   ```
   Then open http://localhost:3000 in a browser.

4. To view it at phone size: open browser DevTools (F12) → device toolbar
   (Ctrl+Shift+M) → pick a phone size. For a live demo, just narrow the actual
   browser window instead of showing DevTools.

## What's real vs. placeholder right now

| Feature | Status |
|---|---|
| Activity Log | Fully real — persisted to `server/data/activities.json` |
| Weather | Real API call once `OPENWEATHER_API_KEY` is set; graceful placeholder without it |
| Diagnose | Real photo upload + persistence always; calls the Kindwise/Plant.id API once `PLANT_ID_API_KEY` is set — **confirm the exact request/response shape against their docs before the real demo**, the parsing in `server/routes/diagnose.js` is written from their documented shape but not yet tested against a live key |
| Low-confidence handling | Implemented — results below 50% confidence show a "not confident" message instead of a recommendation |
| Location-denied fallback | UI fallback present; manual-location geocoding not wired up yet (noted in code) |

## Project structure

```
agro-botsa-full/
├── server/
│   ├── server.js          # Express app entry point
│   ├── routes/
│   │   ├── weather.js      # GET /api/weather
│   │   ├── diagnose.js     # POST/GET /api/diagnose
│   │   └── activity.js     # GET/POST/DELETE /api/activity
│   ├── data/
│   │   └── store.js        # simple JSON-file data layer (swap for a real DB later)
│   ├── recommendations.js  # disease/pest -> treatment text lookup
│   └── uploads/             # temp photo storage during processing
└── public/                  # frontend (plain HTML/CSS/JS)
```

## Upgrade path

The `server/data/store.js` file is the only place touching storage — swapping the
JSON-file approach for MySQL/Postgres later means rewriting that one file, not
anything that calls it.
