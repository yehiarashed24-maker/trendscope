import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  RefreshCw,
  Eye,
  EyeOff,
  Pentagon,
  Square,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Crosshair,
} from 'lucide-react';
import { GeographicRegion, VariableId, LstMode } from '../../types/scientific';
import { MapLegend } from './MapLegend';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import { formatCoordinate } from '../../utils/formatters';
import { useAppStore } from '../../store/useAppStore';

interface MapContainerProps {
  region: GeographicRegion;
  variableId?: VariableId;
  unit?: string;
  gridCells?: Array<{
    id: string;
    lat: number;
    lng: number;
    trendPerDecade: number;
    pValue: number;
    meanVal: number;
  }>;
  customGeoJson?: GeoJSON.FeatureCollection;
  height?: string;
  showLayerSelect?: boolean;
  onLayerChange?: (variableId: VariableId) => void;
}

const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_API_KEY || '';
const NILE_DELTA_DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [29.85, 30.02],
  [32.35, 31.60],
];

export const MapContainer: React.FC<MapContainerProps> = ({
  region,
  variableId = 'ndvi',
  unit = 'NDVI [-0.2 to 1.0]',
  gridCells = [],
  customGeoJson,
  height = '480px',
  showLayerSelect = false,
  onLayerChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const inspectPopupRef = useRef<maplibregl.Popup | null>(null);

  const { activeConfig, setRegion, setLstMode, loadCustomGeoJSON } = useAppStore();
  const lstMode: LstMode = activeConfig.lstMode || 'day';
  const lstModeRef = useRef<LstMode>(lstMode);
  lstModeRef.current = lstMode;

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gisStyleMode, setGisStyleMode] = useState<'hybrid' | 'dark'>(
    MAPTILER_KEY ? 'hybrid' : 'dark'
  );

  // Raster overlay state
  const [rasterVisible, setRasterVisible] = useState(true);
  const [rasterOpacity, setRasterOpacity] = useState(0.72);

  // Boundary GeoJSON from backend
  const [nileDeltaBoundary, setNileDeltaBoundary] = useState<any>(null);
  const [subregionsGeoJson, setSubregionsGeoJson] = useState<any>(null);

  // Polygon / Rectangle Drawing & Custom Region validation state
  const [drawMode, setDrawMode] = useState<'inspect' | 'polygon' | 'rectangle'>('inspect');
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const variableIdRef = useRef(variableId);
  variableIdRef.current = variableId;

  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const draftPointsRef = useRef(draftPoints);
  draftPointsRef.current = draftPoints;

  const [customValidationMsg, setCustomValidationMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    geoJson?: any;
  } | null>(null);

  const darkCartoStyle: maplibregl.StyleSpecification = {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap &copy; CARTO &copy; NASA EOSDIS',
      },
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 18,
      },
    ],
  };

  const getActiveStyle = (mode: 'hybrid' | 'dark'): string | maplibregl.StyleSpecification => {
    if (!MAPTILER_KEY) return darkCartoStyle;
    return mode === 'hybrid'
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
  };

  // Load official Nile Delta boundary + 9 subregions from FastAPI backend
  useEffect(() => {
    fetch('/api/geography/nile-delta')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setNileDeltaBoundary(d);
      })
      .catch(() => {});

    fetch('/api/geography/subregions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setSubregionsGeoJson(d);
      })
      .catch(() => {});
  }, []);

  // Validate a completed polygon against `/api/geography/custom-region`
  const submitCustomPolygon = async (coordsRing: [number, number][]) => {
    const closed = [...coordsRing];
    if (
      closed.length >= 3 &&
      (closed[0][0] !== closed[closed.length - 1][0] ||
        closed[0][1] !== closed[closed.length - 1][1])
    ) {
      closed.push(closed[0]);
    }
    const polyGeom = {
      type: 'Polygon',
      coordinates: [closed],
    };

    try {
      const res = await fetch('/api/geography/custom-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom Nile Delta Investigation Polygon',
          geometry: polyGeom,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.detail?.error ||
          data?.error ||
          'Polygon lies outside the Nile Delta study area.';
        setCustomValidationMsg({ type: 'error', text: msg });
        return;
      }

      setCustomValidationMsg({
        type: 'success',
        text: `Clipped to Nile Delta: ${data.areaKm2} km² (${data.clippedCoveragePercent}% inside Delta)`,
        geoJson: data.clippedFeature,
      });
      try {
        loadCustomGeoJSON(data.clippedFeature, 'custom_nile_delta.geojson');
      } catch {
        // ignore if store rejection
      }
      setDraftPoints([]);
      setDrawMode('inspect');
    } catch (err: any) {
      setCustomValidationMsg({
        type: 'error',
        text: err?.message || 'Failed to validate custom polygon.',
      });
    }
  };

  // Initialize MapLibre centered on the Nile Delta
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getActiveStyle(gisStyleMode),
      center: region?.coordinates || [31.05, 30.85],
      zoom: 8.1,
      minZoom: 6.2,
      maxZoom: 14.5,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'MOD13Q1.061 (250m NDVI) & MOD11C3.061 (0.05° Day/Night LST) • Nile Delta',
      }),
      'bottom-right'
    );

    map.on('mousemove', (e) => {
      setCursorCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('click', async (e) => {
      const lngLat: [number, number] = [
        Number(e.lngLat.lng.toFixed(5)),
        Number(e.lngLat.lat.toFixed(5)),
      ];

      if (drawModeRef.current === 'polygon') {
        setDraftPoints((prev) => [...prev, lngLat]);
        return;
      }

      if (drawModeRef.current === 'rectangle') {
        const current = draftPointsRef.current;
        if (current.length === 0) {
          setDraftPoints([lngLat]);
        } else {
          const [w0, s0] = current[0];
          const [e0, n0] = lngLat;
          const minX = Math.min(w0, e0);
          const maxX = Math.max(w0, e0);
          const minY = Math.min(s0, n0);
          const maxY = Math.max(s0, n0);
          const rectCoords: [number, number][] = [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY],
          ];
          await submitCustomPolygon(rectCoords);
        }
        return;
      }

      // Inspect mode: check if user clicked a subregion first
      const subFeatures = map.getLayer('subregions-fill')
        ? map.queryRenderedFeatures(e.point, { layers: ['subregions-fill'] })
        : [];
      if (subFeatures && subFeatures.length > 0) {
        const clickedId = subFeatures[0].properties?.id;
        if (clickedId) {
          setRegion(clickedId);
        }
      }

      // Inspect real pixel value at click coordinates via backend `/api/raster/inspect`
      const activeVar = variableIdRef.current;
      const activeMode = lstModeRef.current;
      try {
        const res = await fetch(
          `/api/raster/inspect?variable=${activeVar}&lst_mode=${activeMode}&lat=${lngLat[1]}&lng=${lngLat[0]}`
        );
        if (!res.ok) return;
        const info = await res.json();

        inspectPopupRef.current?.remove();
        const titleLabel =
          activeVar === 'ndvi'
            ? 'MODIS NDVI (MOD13Q1.061)'
            : `MODIS LST (MOD11C3.061 • ${activeMode === 'both' ? 'DAY & NIGHT' : activeMode === 'night' ? 'NIGHT' : 'DAY'})`;

        const valueHtml =
          activeVar === 'lst' && activeMode === 'both'
            ? `
              <div>Daytime: <strong style="color: #F59E0B;">${info.dayValue ?? info.value} ${info.unit}</strong></div>
              <div>Nighttime: <strong style="color: #38BDF8;">${info.nightValue ?? '—'} ${info.unit}</strong></div>
              <div>Diurnal Spread: <strong style="color: #10B981;">${info.diurnalRange ?? '—'} ${info.unit}</strong></div>
            `
            : `<div>Value: <strong style="color: #10B981;">${info.value} ${info.unit}</strong></div>`;

        const html = info.insideNileDelta && info.value !== null
          ? `
            <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #E2E8F0; background: #0B0F17; padding: 8px 10px; border-radius: 8px; border: 1px solid #1E293B;">
              <div style="font-weight: 700; color: #38BDF8; margin-bottom: 4px;">
                ${titleLabel}
              </div>
              ${valueHtml}
              <div>Quality: <span style="color: #CBD5E1;">${info.qualityStatus}</span></div>
              <div>Native Res: <span style="color: #FBBF24;">${info.nativeResolution}</span></div>
              <div style="color: #94A3B8; font-size: 10px; margin-top: 3px;">${info.lat}°, ${info.lng}°</div>
            </div>
          `
          : `
            <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #FCA5A5; background: #0B0F17; padding: 8px 10px; border-radius: 8px; border: 1px solid #7F1D1D;">
              <strong>Outside Valid Nile Delta Mask</strong><br/>
              <span style="color: #94A3B8;">${info.message || 'No valid satellite retrieval at this coordinate.'}</span>
            </div>
          `;

        inspectPopupRef.current = new maplibregl.Popup({ closeOnClick: true })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(map);
      } catch {
        // ignore network hiccup
      }
    });

    map.on('load', () => {
      setMapLoaded(true);
      map.fitBounds(NILE_DELTA_DEFAULT_BOUNDS, { padding: 30, duration: 800 });
    });

    mapInstanceRef.current = map;

    return () => {
      inspectPopupRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync raster XYZ tile overlay (`ndvi` or `lst`) from FastAPI backend
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const rasterLayerId = 'nasa-delta-raster-layer';
    const rasterSourceId = 'nasa-delta-raster-source';

    const syncRaster = () => {
      if (map.getLayer(rasterLayerId)) map.removeLayer(rasterLayerId);
      if (map.getSource(rasterSourceId)) map.removeSource(rasterSourceId);

      if (!rasterVisible) return;

      const tileUrl = `${window.location.origin}/api/raster/tiles/${variableId}/{z}/{x}/{y}.png?lst_mode=${lstMode}`;
      map.addSource(rasterSourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        bounds: [29.8, 29.95, 32.4, 31.65],
      });

      const beforeLayer = map.getLayer('nile-delta-outline') ? 'nile-delta-outline' : undefined;
      map.addLayer(
        {
          id: rasterLayerId,
          type: 'raster',
          source: rasterSourceId,
          paint: {
            'raster-opacity': rasterOpacity,
            'raster-resampling': 'nearest',
          },
        },
        beforeLayer
      );
    };

    if (map.isStyleLoaded()) {
      syncRaster();
    } else {
      map.once('styledata', syncRaster);
    }
  }, [variableId, lstMode, rasterVisible, mapLoaded]);

  // Live opacity update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    if (map.getLayer('nasa-delta-raster-layer')) {
      map.setPaintProperty('nasa-delta-raster-layer', 'raster-opacity', rasterOpacity);
    }
  }, [rasterOpacity, mapLoaded]);

  // Fit bounds when active region updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !region?.bbox) return;
    map.fitBounds(
      [
        [region.bbox[0], region.bbox[1]],
        [region.bbox[2], region.bbox[3]],
      ],
      { padding: 45, duration: 900 }
    );
  }, [region, mapLoaded]);

  // Render Nile Delta outer study boundary + clickable subregions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const renderBoundaries = () => {
      if (nileDeltaBoundary) {
        if (map.getSource('nile-delta-boundary-src')) {
          (map.getSource('nile-delta-boundary-src') as maplibregl.GeoJSONSource).setData(
            nileDeltaBoundary
          );
        } else {
          map.addSource('nile-delta-boundary-src', {
            type: 'geojson',
            data: nileDeltaBoundary,
          });
          map.addLayer({
            id: 'nile-delta-outline',
            type: 'line',
            source: 'nile-delta-boundary-src',
            paint: {
              'line-color': '#38BDF8',
              'line-width': 2.2,
            },
          });
        }
      }

      if (subregionsGeoJson) {
        if (map.getSource('subregions-src')) {
          (map.getSource('subregions-src') as maplibregl.GeoJSONSource).setData(subregionsGeoJson);
        } else {
          map.addSource('subregions-src', {
            type: 'geojson',
            data: subregionsGeoJson,
          });
          map.addLayer({
            id: 'subregions-fill',
            type: 'fill',
            source: 'subregions-src',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'id'], region.id],
                '#0EA5E9',
                '#FFFFFF',
              ],
              'fill-opacity': [
                'case',
                ['==', ['get', 'id'], region.id],
                0.22,
                0.04,
              ],
            },
          });
          map.addLayer({
            id: 'subregions-line',
            type: 'line',
            source: 'subregions-src',
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'id'], region.id],
                '#38BDF8',
                'rgba(148, 163, 184, 0.55)',
              ],
              'line-width': [
                'case',
                ['==', ['get', 'id'], region.id],
                2.2,
                1.0,
              ],
            },
          });
        }

        if (map.getLayer('subregions-fill')) {
          map.setPaintProperty('subregions-fill', 'fill-opacity', [
            'case',
            ['==', ['get', 'id'], region.id],
            0.22,
            0.04,
          ]);
          map.setPaintProperty('subregions-line', 'line-color', [
            'case',
            ['==', ['get', 'id'], region.id],
            '#38BDF8',
            'rgba(148, 163, 184, 0.55)',
          ]);
        }
      }
    };

    if (map.isStyleLoaded()) {
      renderBoundaries();
    } else {
      map.once('styledata', renderBoundaries);
    }
  }, [nileDeltaBoundary, subregionsGeoJson, region.id, mapLoaded]);

  // Render custom drawn / uploaded GeoJSON polygon overlay + live draft vertices
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const draftGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(customValidationMsg?.geoJson ? [customValidationMsg.geoJson] : []),
        ...(draftPoints.length >= 2
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: draftPoints,
                },
              },
            ]
          : []),
        ...draftPoints.map((pt, i) => ({
          type: 'Feature' as const,
          properties: { idx: i },
          geometry: { type: 'Point' as const, coordinates: pt },
        })),
      ],
    };

    if (map.getSource('draft-poly-src')) {
      (map.getSource('draft-poly-src') as maplibregl.GeoJSONSource).setData(draftGeoJson);
    } else if (map.isStyleLoaded()) {
      map.addSource('draft-poly-src', { type: 'geojson', data: draftGeoJson });
      map.addLayer({
        id: 'draft-poly-fill',
        type: 'fill',
        source: 'draft-poly-src',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#F59E0B', 'fill-opacity': 0.25 },
      });
      map.addLayer({
        id: 'draft-poly-line',
        type: 'line',
        source: 'draft-poly-src',
        paint: { 'line-color': '#FBBF24', 'line-width': 2.2 },
      });
      map.addLayer({
        id: 'draft-poly-pts',
        type: 'circle',
        source: 'draft-poly-src',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#FBBF24',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#090D16',
        },
      });
    }
  }, [draftPoints, customValidationMsg, mapLoaded]);

  // Render statistical grid trend nodes if provided
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'grid-cells-source';
    const layerId = 'grid-cells-circle';
    const pointsGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: gridCells.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          trend: c.trendPerDecade,
          pVal: c.pValue,
          mean: c.meanVal,
        },
      })),
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(pointsGeoJson);
    } else if (gridCells.length > 0 && map.isStyleLoaded()) {
      map.addSource(sourceId, { type: 'geojson', data: pointsGeoJson });
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'trend'],
            -0.03,
            '#38BDF8',
            0,
            '#FBBF24',
            0.03,
            '#10B981',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }
  }, [gridCells, mapLoaded, unit]);

  const handleResetBounds = () => {
    mapInstanceRef.current?.fitBounds(NILE_DELTA_DEFAULT_BOUNDS, { padding: 30, duration: 800 });
  };

  const handleExportCustomGeoJson = () => {
    if (!customValidationMsg?.geoJson) return;
    const blob = new Blob([JSON.stringify(customValidationMsg.geoJson, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nile_delta_custom_region.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="relative rounded-xl border border-slate-800 overflow-hidden bg-obsidian-950 flex flex-col"
      style={{ height }}
    >
      {/* Top Map Controls */}
      <div className="absolute top-3 start-3 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-64px)]">
        <DemoDataBadge status="VERIFIED" size="sm" />

        <button
          type="button"
          onClick={handleResetBounds}
          title="Fit Nile Delta Study Area"
          className="p-1.5 rounded bg-obsidian-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur shadow cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {showLayerSelect && onLayerChange && (
          <div className="inline-flex items-center gap-1">
            <div className="inline-flex rounded bg-obsidian-900/90 border border-slate-700 p-0.5 backdrop-blur text-[10px] font-mono">
              {(['ndvi', 'lst'] as VariableId[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onLayerChange(v)}
                  className={`px-2 py-0.5 rounded uppercase font-semibold cursor-pointer ${
                    variableId === v ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'ndvi' ? 'NDVI (250m)' : 'LST (0.05°)'}
                </button>
              ))}
            </div>
            {variableId === 'lst' && (
              <div className="inline-flex rounded bg-obsidian-900/90 border border-slate-700 p-0.5 backdrop-blur text-[10px] font-mono">
                {(['day', 'night', 'both'] as LstMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLstMode(m)}
                    className={`px-1.5 py-0.5 rounded uppercase font-semibold cursor-pointer ${
                      lstMode === m ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raster Visibility & Opacity */}
        <div className="inline-flex items-center gap-1.5 rounded bg-obsidian-900/90 border border-slate-700 px-2 py-1 backdrop-blur text-[10px] font-mono text-slate-300">
          <button
            type="button"
            onClick={() => setRasterVisible((v) => !v)}
            className="hover:text-white cursor-pointer"
            title="Toggle NASA Raster Layer"
          >
            {rasterVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={rasterOpacity}
            onChange={(e) => setRasterOpacity(Number(e.target.value))}
            className="w-14 accent-sky-400 cursor-pointer"
            title="Raster Opacity"
          />
        </div>

        {/* Drawing & Inspect Mode Toolbar */}
        <div className="inline-flex items-center rounded bg-obsidian-900/90 border border-slate-700 p-0.5 backdrop-blur text-[10px] font-mono">
          <button
            type="button"
            onClick={() => {
              setDrawMode('inspect');
              setDraftPoints([]);
            }}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
              drawMode === 'inspect' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Click pixel to inspect real MODIS NDVI / LST value"
          >
            <Crosshair className="w-3 h-3" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawMode('polygon');
              setDraftPoints([]);
              setCustomValidationMsg(null);
            }}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
              drawMode === 'polygon' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Click 3+ points inside Nile Delta to draw polygon"
          >
            <Pentagon className="w-3 h-3" />
            <span className="hidden sm:inline">Polygon</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawMode('rectangle');
              setDraftPoints([]);
              setCustomValidationMsg(null);
            }}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
              drawMode === 'rectangle' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Click 2 corners inside Nile Delta to draw rectangle"
          >
            <Square className="w-3 h-3" />
            <span className="hidden sm:inline">Rect</span>
          </button>
        </div>

        {drawMode === 'polygon' && draftPoints.length >= 3 && (
          <button
            type="button"
            onClick={() => submitCustomPolygon(draftPoints)}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-semibold flex items-center gap-1 shadow cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>Finish ({draftPoints.length} pts)</span>
          </button>
        )}

        {customValidationMsg?.geoJson && (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportCustomGeoJson}
              className="p-1.5 rounded bg-zinc-900/90 border border-slate-700 text-sky-400 hover:text-white cursor-pointer"
              title="Export Clipped GeoJSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomValidationMsg(null);
                setDraftPoints([]);
                setRegion('nile_delta');
              }}
              className="p-1.5 rounded bg-zinc-900/90 border border-slate-700 text-rose-400 hover:text-white cursor-pointer"
              title="Clear Custom Polygon"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {MAPTILER_KEY && (
          <div className="hidden md:inline-flex rounded bg-[#0A1020]/90 border border-[#2B3F70] p-0.5 backdrop-blur text-[10px] font-mono">
            <button
              type="button"
              onClick={() => {
                setGisStyleMode('hybrid');
                mapInstanceRef.current?.setStyle(
                  `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
                );
              }}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                gisStyleMode === 'hybrid'
                  ? 'bg-[#4F8BFF] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => {
                setGisStyleMode('dark');
                mapInstanceRef.current?.setStyle(
                  `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
                );
              }}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                gisStyleMode === 'dark'
                  ? 'bg-[#4F8BFF] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark GIS
            </button>
          </div>
        )}
      </div>

      {/* Custom Polygon Validation / Error Alert */}
      {customValidationMsg && (
        <div
          className={`absolute top-14 start-3 z-10 px-3 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-2 backdrop-blur ${
            customValidationMsg.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{customValidationMsg.text}</span>
        </div>
      )}

      {/* MapLibre Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1" />

      {/* Floating Map Legend */}
      <div className="hidden sm:block absolute bottom-7 start-3 z-10 max-w-[260px]">
        <MapLegend variableId={variableId} lstMode={lstMode} unit={unit} />
      </div>

      {/* Bottom Coordinates & Metadata Bar */}
      <div className="h-6 bg-obsidian-950/95 border-t border-slate-800/80 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span>NILE DELTA • EPSG:4326</span>
          <span className="hidden sm:inline text-sky-400">
            • {variableId === 'ndvi' ? 'MOD13Q1 250m' : `MOD11C3 LST 0.05° (${lstMode.toUpperCase()})`}
          </span>
          <span className="hidden md:inline">• CLICK MAP TO INSPECT PIXEL</span>
        </div>
        <div className="shrink-0">
          {cursorCoords ? (
            formatCoordinate(cursorCoords.lat, cursorCoords.lng)
          ) : (
            <span>30.85°N, 31.05°E</span>
          )}
        </div>
      </div>
    </div>
  );
};
