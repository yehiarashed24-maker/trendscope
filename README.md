---
title: TrendScope Nile Delta
emoji: 🌍
colorFrom: blue
colorTo: slate
sdk: gradio
sdk_version: 5.17.1
app_file: app.py
pinned: false
---

# EARTHPULSE AI — NILE DELTA EDITION

**Discover Earth's Changes. Investigate the Evidence. Understand the Future.**

EARTHPULSE AI — Nile Delta Edition is a full-stack scientific Earth observation and agricultural intelligence platform restricted exclusively to the **Nile Delta, Egypt**, monitoring **Vegetation Conditions (NDVI)** and **Surface Soil Moisture** using real NASA Earth observation products, geospatial raster processing, non-parametric statistical analysis, and grounded AI interpretation.

---

## 1. Scientific Scope & Supported NASA Datasets

The platform focuses strictly on **two verified NASA Earth observation variables** over the Nile Delta (`nile_delta` and 9 subregions in `EPSG:4326`):

| Variable | NASA Dataset | DOI | Native Spatial Resolution | Temporal Frequency | Historical Coverage | Quality Control & Scaling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NDVI (`ndvi`)** | `MOD13Q1.061` (MODIS/Terra LP DAAC) | `10.5067/MODIS/MOD13Q1.061` | **250 m** (Sinusoidal Grid `h20v05`) | 16-day composite | 2000-02-18 – Present | `_250m_16_days_pixel_reliability`, scale factor `0.0001`, valid `[-2000, 10000]`, NoData `-3000` |
| **Soil Moisture (`soil_moisture`)** | `SPL3SMP_E.006` (SMAP NSIDC DAAC) | `10.5067/M20OXIZHY3RJ` | **9 km** (EASE-Grid 2.0) | Daily | 2015-03-31 – Present | `retrieval_qual_flag`, unit `cm³/cm³`, valid `[0.02, 0.50]`, NoData `-9999.0` |

> **Spatial Scale Integrity:** MODIS NDVI (**250 m**) and SMAP Soil Moisture (**9 km**) are never artificially upsampled to match each other. Combined NDVI–Soil Moisture coupling (`2015-04-01` onward) is evaluated at regional monthly scale with transparent resolution disclosures across all UI views, AI explanations, and PDF reports.

---

## 2. Full-Stack Architecture

### Backend (`backend/` — FastAPI + Scientific Python)
- **FastAPI API (`backend/main.py`):** REST endpoints under `/api/*` for geography, NASA granule discovery, raster statistics/tiles, trend/correlation/anomaly analysis, investigation persistence (SQLite), grounded Gemini AI Scientist explanations, and ReportLab PDF generation.
- **NASA Acquisition (`backend/services/nasa_engine.py`):** Live CMR granule search, OPeNDAP subsetting/caching, and credential status inspection.
- **Geospatial Boundaries (`backend/services/geography_service.py`):** Enforces Nile Delta study boundary + 9 subregions (`kafr_el_sheikh`, `dakahlia`, `gharbia`, `beheira_delta`, `sharqia_delta`, `monufia`, `qalyubia`, `damietta`, `ismailia_canal`) with Shapely clipping and strict rejection (`HTTP 422`) of outside polygons.
- **Raster Engine (`backend/services/raster_service.py`):** Produces georeferenced EPSG:4326 GeoTIFFs, polygon-clipped zonal statistics, coordinate pixel inspection (`/api/raster/inspect`), RGBA overlays, and Web Mercator XYZ tiles (`/api/raster/tiles/{variableId}/{z}/{x}/{y}.png`).
- **Statistical Engine (`backend/services/stats_engine.py`):** Two-tailed Mann-Kendall rank trend test (`pymannkendall`), Theil-Sen median slope estimator (`scipy.stats.theilslopes`) with 95% confidence bounds, Pearson $r$ & Spearman $\rho$ correlation, and standardized $|Z|$-score anomalies.
- **Grounded AI Scientist (`backend/services/ai_service.py`):** Backend-only calls to Google Gemini (`gemini-2.5-flash`) grounded strictly in computed regional statistics with a deterministic grounded engine fallback.
- **Publication PDF Dossier (`backend/services/report_generator.py`):** ReportLab generator producing downloadable scientific dossiers (`/api/reports/generate`).

### Frontend (`src/` — React + TypeScript + Vite + MapLibre GL + Plotly)
- **Routes Preserved:** `/` (Landing), `/explorer`, `/analysis`, `/intelligence`, `/workspace`, `/dashboard`, `/reports`.
- **Multilingual UI:** English (`en`), Arabic (`ar` RTL), German (`de`), and French (`fr`).
- **API Proxy:** `vite.config.ts` proxies `/api/*` to the FastAPI backend (`http://127.0.0.1:8000`). API secrets (`EARTHDATA_TOKEN`, `NASA_API_KEY`, `GEMINI_API_KEY`) live exclusively in `backend/.env` and are never exposed in frontend `VITE_*` variables.

---

## 3. Running Locally

### Configuration
Create `backend/.env` with your server-side credentials (`EARTHDATA_TOKEN`, `NASA_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`). Never commit `.env` files or expose secrets in client-side environment variables.

### Quick Start (Backend + Frontend)
```bash
./start.sh
```
This starts:
- FastAPI Backend: `http://127.0.0.1:8000/api/health`
- Vite Frontend: `http://127.0.0.1:5173`

### Verification Commands
```bash
# Backend automated test suite (6 integration & scientific tests)
./.venv/bin/python -m pytest backend/tests/test_earthpulse.py -v

# Frontend TypeScript check & production build
npx tsc --noEmit && npm run build
```
