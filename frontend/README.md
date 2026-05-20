# Frontend

React + Vite frontend for the DECO3801 Fungi Pattern Analysis project (MycoSignal / Olive).

The frontend handles dataset upload, signal preview, analysis configuration, results visualisation, and educational features. For the full ML analysis workflow to function, both the backend API and Python ML service must be running.

`sameple_time_voltage.csv` is provided for testing and usage sample dataset.

---

## Prerequisites — Full Workflow

The frontend can be started on its own, but ML analysis results require the backend and ML service to be running. See their respective READMEs:

- [backend/README.md](../backend/README.md) — Node.js API + worker
- [ml-service/README.md](../ml-service/README.md) — Python FastAPI inference service

Minimum services required for full analysis:

| Terminal | Command | What it runs |
|---|---|---|
| 1 | `cd backend && npm run start:all` | Backend API + worker (port 5000) |
| 2 | `cd ml-service && uvicorn app.main:app --reload --port 8001` | ML service (port 8001) |
| 3 | `cd frontend && npm run dev` | Frontend dev server (port 5173) |

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

`.env` contents:

```env
VITE_API_URL=http://localhost:5000
VITE_ML_URL=http://localhost:8001
```

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL — dataset uploads, job submission, result fetching |
| `VITE_ML_URL` | ML service base URL — used for direct ML service references |

---

## Installation

```bash
cd frontend
npm install
```

---

## Running Locally

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`.

---

## Other Scripts

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Start with HMR |
| Production build | `npm run build` | Minified output to `dist/` |
| Preview build | `npm run preview` | Serve built `dist/` locally |
| Lint | `npm run lint` | Run ESLint |

---

## Tech Stack

| Category | Library / Tool |
|---|---|
| Framework | React 18 + Vite 6 |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui + Radix UI primitives |
| Icons | Lucide React |
| Animation | Framer Motion |
| 3D Graphics | Three.js + @react-three/fiber + @react-three/drei |
| Data Parsing | XLSX (CSV and Excel) |
| Build Tool | Vite |

The project uses `.jsx` files throughout — there is no TypeScript config. Path alias `@` maps to `src/`.

---

## Pages

Navigation is managed by state in `App.jsx` — there is no client-side router.

| Page | Component | Description |
|---|---|---|
| **Get Started** | `GetStarted.jsx` | Onboarding hero with 3D fungal orb animation and a step-by-step usage wizard |
| **Workspace** | `MainWorkspace.jsx` | Main hub — file upload, dataset list, signal chart preview, analysis configuration |
| **Analysis** | `AnalysisView.jsx` | Results view — detected patterns, prediction chart, metrics, and summary |
| **Models** | `Models.jsx` | Model information and documentation |
| **History** | `History.jsx` | Past experiment runs |
| **Fungi Garden** | `FungiGarden.jsx` | Educational 3D fungal growth simulation |

---

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx                        # React root mount
│   ├── App.jsx                         # Root component — all page state and navigation
│   ├── index.css                       # Tailwind directives + CSS variables
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.jsx            # Sidebar, topbar, main content layout
│   │   ├── pages/
│   │   │   ├── GetStarted.jsx          # Onboarding + 3D canvas
│   │   │   ├── MainWorkspace.jsx       # Upload, preview, config, analysis trigger
│   │   │   ├── AnalysisView.jsx        # Results display
│   │   │   ├── FungiGarden.jsx         # Educational 3D simulation
│   │   │   ├── Models.jsx              # Model info page
│   │   │   └── History.jsx             # Experiment history
│   │   ├── dialogs/
│   │   │   └── AllDialogs.jsx          # All modals managed in one place
│   │   ├── shared/
│   │   │   ├── SectionTitle.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── MiniLine.jsx
│   │   └── ui/                         # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── select.jsx
│   │       ├── tabs.jsx
│   │       └── ...
│   ├── constants/
│   │   └── data.js                     # Nav items, sample signal data
│   └── lib/
│       └── utils.jsx                   # cn() Tailwind class merge utility
├── .env                                # Local env vars (not committed)
├── .env.example                        # Env var template
├── vite.config.js                      # Vite config + @ alias
├── tailwind.config.js
├── postcss.config.js
├── components.json                     # shadcn/ui config
└── index.html                          # HTML entry point
```

---

## Workspace Flow

The intended user flow through the app:

```text
Get Started (onboarding)
  → Workspace
      → Upload CSV or XLSX dataset (Time + Voltage columns required)
      → Preview signal in real-time chart
      → Configure analysis parameters (threshold, window size, model type)
      → Submit analysis job to backend
  → Analysis View
      → View detected patterns
      → View prediction chart
      → Read summary metrics
```

### Dataset format

Uploaded files must contain at minimum a time column and a voltage column. The app auto-detects the time column by checking for headers containing: `time`, `elapsed`, `timestamp`, `second`, `minute`, or `hour`. The first numeric non-time column is used as the voltage signal.

CSV example:

```csv
Time,Voltage
0,0.12
1,0.18
2,0.32
```

Multi-sheet Excel files are supported — the app lets users switch between sheets before running analysis.



---

## Analysis Configuration

The workspace exposes these parameters before submitting a job:

| Parameter | Options / Range | Description |
|---|---|---|
| **Analysis type** | detect patterns / custom exploration / predict future | Selects the Workspace job type |
| **Classifier** | random-forest, svm, gb | Pattern classifier model selection |
| **Sequence model** | lstm, transformer, tcn | Sequence model for prediction |
| **Window size** | slider | Signal window length for feature extraction |
| **Threshold** | slider | Spike detection sensitivity |
| **Baseline removal** | toggle | Apply moving average subtraction |
| **Normalization** | toggle | Apply min-max scaling |
| **Prediction** | toggle | Enable future voltage prediction |

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy this folder to any static host (Vercel, Netlify, Render static site).

Set the production environment variables in your host's dashboard:

```env
VITE_API_URL=https://your-backend-api.onrender.com
VITE_ML_URL=https://your-ml-service.onrender.com
```

> Vite bakes env variables into the bundle at build time. You must rebuild after changing env vars.
