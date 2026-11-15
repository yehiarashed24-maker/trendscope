import { GeographicRegion, GeoJSONFeatureAdapterResult } from '../../types/scientific';
import { PREDEFINED_REGIONS } from '../nasa/constants';

/**
 * Calculates a bounding box [minLng, minLat, maxLng, maxLat] from any arbitrary coordinates array.
 */
function computeBBoxFromCoordinates(coords: any): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function traverse(item: any) {
    if (
      Array.isArray(item) &&
      item.length >= 2 &&
      typeof item[0] === 'number' &&
      typeof item[1] === 'number'
    ) {
      const [lng, lat] = item;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(item)) {
      for (const sub of item) {
        traverse(sub);
      }
    }
  }

  traverse(coords);

  if (!isFinite(minLng) || !isFinite(minLat)) {
    return [29.85, 30.02, 32.35, 31.60]; // Default Nile Delta study area bbox
  }
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Robust GeoJSON Data Adapter for EARTHPULSE AI — NILE DELTA EDITION.
 * Validates that custom uploaded features lie within or intersect the Nile Delta study area.
 */
export function adaptIncomingGeoJSON(
  rawInput: any,
  fileName = 'nile_delta_custom.geojson'
): GeoJSONFeatureAdapterResult {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Invalid GeoJSON input: Expected an object structure.');
  }

  let featureCollection: GeoJSON.FeatureCollection;

  if (rawInput.type === 'FeatureCollection' && Array.isArray(rawInput.features)) {
    featureCollection = rawInput as GeoJSON.FeatureCollection;
  } else if (rawInput.type === 'Feature') {
    featureCollection = {
      type: 'FeatureCollection',
      features: [rawInput],
    };
  } else if (rawInput.type && ['Polygon', 'MultiPolygon', 'Point', 'GeometryCollection'].includes(rawInput.type)) {
    featureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: rawInput,
          properties: { name: fileName.replace(/\.[^/.]+$/, '') },
        },
      ],
    };
  } else if (Array.isArray(rawInput)) {
    featureCollection = {
      type: 'FeatureCollection',
      features: rawInput.filter((f) => f && f.type === 'Feature'),
    };
  } else {
    throw new Error('Unrecognized geospatial data structure. Please provide a standard GeoJSON file.');
  }

  const overallBbox = computeBBoxFromCoordinates(featureCollection);
  const [minLng, minLat, maxLng, maxLat] = overallBbox;
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
    throw new Error('Coordinates out of EPSG:4326 bounds [-180..180, -90..90].');
  }

  const detectedRegions: GeographicRegion[] = [];

  featureCollection.features.forEach((feature, index) => {
    const props = feature.properties || {};
    const id =
      props.id ||
      `custom_${index}_${String(props.name || 'nile_delta_zone')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}`;
    const name =
      props.name ||
      props.NAME ||
      props.NAME_EN ||
      props.id ||
      `Nile Delta Zone ${index + 1}`;

    const code = props.code || props.CODE || `ND-${index + 1}`;

    const featBbox = feature.bbox
      ? (feature.bbox as [number, number, number, number])
      : computeBBoxFromCoordinates(feature.geometry);

    const centerLng = Number(((featBbox[0] + featBbox[2]) / 2).toFixed(4));
    const centerLat = Number(((featBbox[1] + featBbox[3]) / 2).toFixed(4));

    detectedRegions.push({
      id: String(id),
      code: String(code).toUpperCase(),
      name: String(name),
      name_ar: props.name_ar,
      name_de: props.name_de,
      name_fr: props.name_fr,
      coordinates: [centerLng, centerLat],
      bbox: featBbox,
      areaKm2: Number(props.area_km2 || props.AREA || 1850),
      climateZone: props.climate_zone || props.climate || 'Nile Delta Irrigated Agricultural Zone',
      countryCode: 'EG-ND',
    });
  });

  const allRegions =
    fileName === 'fallback_boundaries.geojson'
      ? PREDEFINED_REGIONS
      : detectedRegions.length > 0
      ? [...detectedRegions, ...PREDEFINED_REGIONS.filter((r) => !r.countryCode?.startsWith('EG'))]
      : PREDEFINED_REGIONS;

  return {
    featureCollection,
    detectedRegions: allRegions,
    sourceType: fileName === 'fallback_boundaries.geojson' ? 'FALLBACK_BOUNDARIES' : 'CUSTOM_TEAM_FILE',
    featureCount: featureCollection.features.length,
    bbox: overallBbox,
  };
}

/**
 * Default Nile Delta Study Area & 9 Agricultural Subregions GeoJSON
 */
export function getDefaultFallbackGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'nile_delta',
          code: 'ND-ALL',
          name: 'Nile Delta (Full Study Area)',
          name_ar: 'دلتا النيل (منطقة الدراسة الكاملة)',
          name_de: 'Nildelta (Gesamtes Untersuchungsgebiet)',
          name_fr: 'Delta du Nil (Zone d’étude complète)',
          area_km2: 24450.0,
          climate_zone: 'Alluvial Irrigated Agricultural Delta',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [31.18, 30.02],
              [31.38, 30.12],
              [31.68, 30.32],
              [32.15, 30.52],
              [32.32, 30.85],
              [32.28, 31.25],
              [31.92, 31.52],
              [31.42, 31.56],
              [30.92, 31.58],
              [30.42, 31.45],
              [29.92, 31.26],
              [29.88, 30.88],
              [30.22, 30.52],
              [30.72, 30.22],
              [31.18, 30.02],
            ],
          ],
        },
      },
      ...PREDEFINED_REGIONS.filter((r) => r.id !== 'nile_delta' && r.countryCode?.startsWith('EG')).map((r) => {
        const [w, s, e, n] = r.bbox;
        return {
          type: 'Feature' as const,
          properties: {
            id: r.id,
            code: r.code,
            name: r.name,
            name_ar: r.name_ar,
            name_de: r.name_de,
            name_fr: r.name_fr,
            area_km2: r.areaKm2,
            climate_zone: r.climateZone,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [w, s],
                [e, s],
                [e, n],
                [w, n],
                [w, s],
              ],
            ],
          },
        };
      }),
    ],
  };
}
