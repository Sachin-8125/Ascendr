# Ascendr

AI-powered SEO analysis and rank-tracking platform. Enter a URL and get a full audit — SEO score, performance, accessibility, and best practices — with prioritized, actionable fixes.

> **Status: early-stage / work in progress.** The landing page, auth UI, and dashboard shell are built, but the analysis engine, AI integration, and auth logic are not wired up yet. See [Current Status](#current-status) below.

## Planned Features

- **SEO Score** — 50+ ranking factors analyzed with AI-powered insights
- **Performance** — load times, page size, and Core Web Vitals
- **Best Practices** — meta tags, heading structure, image optimization, technical SEO health
- **Accessibility** — alt text, ARIA, and contrast checks
- **Keyword Analysis** — top keywords, density, and content optimization opportunities
- **Rank Tracker** — track keyword rankings over time
- **Actionable Fixes** — prioritized recommendations to boost search rankings

The intended flow: paste a URL → a headless browser visits the site → an AI model analyzes the page → you get a scored report with issues and recommendations.

## Tech Stack

**Client**
- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- React Router 7
- react-hot-toast, lucide-react

**Server**
- Node.js + Express 5
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- dotenv, cors

## Project Structure

```
Ascendr/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── assets/         # Static data, icons, mock analysis data
│       ├── components/     # Shared UI + home page sections
│       ├── context/        # Theme context
│       └── pages/          # Home, Login, Dashboard, Analyze, Report, History, RankTracker...
└── server/                  # Express + MongoDB backend
    ├── config/             # DB connection
    ├── controllers/        # Route handlers (auth in progress)
    └── models/             # Mongoose schemas (User)
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- A MongoDB instance (local or Atlas)

### Server

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

Run it:

```bash
npm run dev    # nodemon, for development
npm start      # plain node
```

### Client

```bash
cd client
npm install
npm run dev
```

The client runs on Vite's default dev server port (usually `http://localhost:5173`).

## Current Status

What's implemented:
- Full landing page (hero, features, how-it-works, pricing sections)
- Client-side routing, including a protected-route wrapper for dashboard pages
- Express server with MongoDB connection
- `User` model (name, email, password, plan, analysis count)

Not yet implemented:
- Auth endpoints (`authController.js` is currently empty) and JWT issuing/verification
- The actual site-scanning/analysis engine — the dashboard and reports currently render mock data (`dummyAnalysisData`)
- `ProtectedRoute` doesn't yet check auth state
- AI-powered scoring/insights pipeline

## Contributing

Issues and pull requests are welcome.

## License

No license specified yet.

