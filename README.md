# 🌐 NOC GIS Network Monitor

Real-time GIS dashboard for monitoring ONU/ONT status across your fiber network. Built for NOC passive displays (TV walls, 4K monitors) with live SmartOLT API integration.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?logo=leaflet)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## ✨ Features

- **Live Map** — Interactive Leaflet map with marker clustering, color-coded by ONU status
- **SmartOLT Integration** — Fetches ONU statuses, details, zones, GPS coordinates, and unconfigured ONUs
- **Smart Caching** — Rate-limited endpoints (3 calls/hour) are cached in-memory to stay within API limits
- **Per-OLT Filtering** — Filter stats and map view by individual OLT
- **Status Filtering** — Click any stat card to isolate Online, LOS, Power Fail, Offline, or Unconfigured ONUs
- **5 Themes** — Dark, Midnight, Cyberpunk, Matrix, Light — with map tiles that adapt per theme
- **Animated Stats** — Numbers animate smoothly on data refresh
- **4K Optimized** — Responsive layout tuned for 1080p through 4K passive displays
- **Auto Refresh** — Configurable polling interval (default 30s)
- **Demo Mode** — Falls back to mock data when no SmartOLT credentials are configured

## 📁 Project Structure

```
src/
├── app/
│   ├── api/dashboard/route.ts   # API endpoint — merges SmartOLT data
│   ├── globals.css              # Full design system with 5 theme palettes
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Dashboard page with state management
├── components/
│   ├── MapView.tsx              # Leaflet map with clustering & theme-aware tiles
│   ├── StatsBar.tsx             # Top stats bar with animated counters
│   ├── OltSelector.tsx          # OLT filter pills
│   ├── Legend.tsx               # Map legend overlay
│   └── ThemePicker.tsx          # Theme switcher with localStorage persistence
└── lib/
    ├── smartolt.ts              # SmartOLT API client with caching strategy
    ├── cache.ts                 # In-memory TTL cache for rate-limited endpoints
    └── mock-data.ts             # Mock data generator for demo/dev
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- SmartOLT account with API access (optional — demo mode works without it)

### Installation

```bash
git clone <repo-url>
cd noc-gis-monitor
npm install
```

### Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```env
SMARTOLT_BASE_URL=https://your-instance.smartolt.com
SMARTOLT_API_TOKEN=your-api-token-here
NEXT_PUBLIC_MAP_CENTER_LAT=-7.5      # Map center latitude
NEXT_PUBLIC_MAP_CENTER_LNG=112.75    # Map center longitude
NEXT_PUBLIC_MAP_ZOOM=11              # Initial zoom level
NEXT_PUBLIC_REFRESH_INTERVAL=30000   # Auto-refresh interval in ms
```

> **Tip:** Leave `SMARTOLT_BASE_URL` and `SMARTOLT_API_TOKEN` empty to run in demo mode with mock data.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🎨 Themes

| Theme | Style | Map Tiles |
|-------|-------|-----------|
| 🌑 Dark | Deep navy dark mode | CartoDB Dark Matter |
| 🌌 Midnight | Indigo-tinted dark | CartoDB Dark Matter |
| ⚡ Cyber | Purple neon cyberpunk | CartoDB Dark Matter |
| 🟢 Matrix | Green-on-black terminal | CartoDB Dark Matter |
| ☀️ Light | Clean light mode | CartoDB Positron |

Theme selection persists across sessions via `localStorage`.

## 🔌 SmartOLT API Strategy

The app uses a two-tier fetching strategy to work within SmartOLT's rate limits:

| Endpoint | Rate Limit | Cache TTL | Refresh |
|----------|-----------|-----------|---------|
| `get_onus_statuses` | Unlimited | None | Every 30s |
| `get_all_onus_details` | 3/hour | 20 min | On cache miss |
| `get_all_onus_gps_coordinates` | 3/hour | 20 min | On cache miss |
| `get_zones` | Unlimited | 30 min | On cache miss |
| `get_unconfigured_onus` | Unlimited | None | Every 30s |

## 🏗️ Production Build

```bash
npm run build
npm start
```

## 📝 License

Private project.
