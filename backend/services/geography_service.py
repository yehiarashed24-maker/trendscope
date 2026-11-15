import json
import hashlib
from typing import Dict, Any, List, Optional, Tuple
import geopandas as gpd
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point
from shapely.validation import make_valid
from pyproj import Transformer

from backend.config import BOUNDARIES_DIR

BOUNDARY_FILE = BOUNDARIES_DIR / "nile_delta_boundary.geojson"
SUBREGIONS_FILE = BOUNDARIES_DIR / "nile_delta_subregions.geojson"

# Equal-Area Cylindrical projection (EASE-Grid 2.0 / EPSG:6933) for exact area_km2 calculation
_TO_EQUAL_AREA = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)


def _compute_area_km2(geom) -> float:
    """Computes exact area in km² by projecting EPSG:4326 geometry to EPSG:6933."""
    projected = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs("EPSG:6933").iloc[0]
    return round(float(projected.area) / 1_000_000.0, 2)


class GeographyService:
    def __init__(self):
        self._boundary_fc: Dict[str, Any] = {}
        self._subregions_fc: Dict[str, Any] = {}
        self._study_polygon = None
        self._regions_by_id: Dict[str, Dict[str, Any]] = {}
        self.reload()

    def reload(self):
        with open(BOUNDARY_FILE, "r", encoding="utf-8") as f:
            self._boundary_fc = json.load(f)
        with open(SUBREGIONS_FILE, "r", encoding="utf-8") as f:
            self._subregions_fc = json.load(f)

        study_feat = self._boundary_fc["features"][0]
        study_geom = shape(study_feat["geometry"])
        if not study_geom.is_valid:
            study_geom = make_valid(study_geom)
        self._study_polygon = study_geom

        self._regions_by_id = {}
        # Register entire Nile Delta study area first
        props = study_feat["properties"]
        bounds = list(study_geom.bounds)  # [minx, miny, maxx, maxy]
        centroid = study_geom.centroid
        self._regions_by_id["nile_delta"] = {
            "id": "nile_delta",
            "code": props.get("code", "ND-ALL"),
            "name": props.get("name", "Entire Nile Delta Study Area"),
            "name_ar": props.get("name_ar", "نطاق دراسة دلتا النيل بالكامل"),
            "name_de": props.get("name_de", "Gesamtes Untersuchungsgebiet Nildelta"),
            "name_fr": props.get("name_fr", "Zone d'étude complète du delta du Nil"),
            "administrative_level": "study_area",
            "country": "EG",
            "countryCode": "EG",
            "coordinates": [round(centroid.x, 4), round(centroid.y, 4)],
            "bbox": [round(b, 4) for b in bounds],
            "areaKm2": props.get("area_km2") or _compute_area_km2(study_geom),
            "area_km2": props.get("area_km2") or _compute_area_km2(study_geom),
            "climateZone": props.get("climate_zone", "BWh / Mediterranean Coastal Deltaic Fan"),
            "geometry": mapping(study_geom),
        }

        seen_ids = {"nile_delta"}
        clipped_features = []
        for feat in self._subregions_fc.get("features", []):
            f_props = dict(feat.get("properties", {}))
            rid = f_props.get("id") or feat.get("id")
            if not rid or rid in seen_ids:
                raise ValueError(f"Invalid or duplicate subregion feature id: {rid}")
            seen_ids.add(rid)

            geom = shape(feat["geometry"])
            if not geom.is_valid:
                geom = make_valid(geom)
            # Clip subregion strictly to the Nile Delta study boundary
            clipped = geom.intersection(self._study_polygon)
            if clipped.is_empty:
                raise ValueError(f"Subregion {rid} does not intersect Nile Delta boundary")

            b = list(clipped.bounds)
            c = clipped.centroid
            calc_area = _compute_area_km2(clipped)
            rep_area = f_props.get("area_km2") or calc_area
            f_props["clipped_area_km2"] = calc_area
            clipped_geom_json = mapping(clipped)
            clipped_features.append({
                "type": "Feature",
                "id": rid,
                "properties": f_props,
                "geometry": clipped_geom_json,
            })
            self._regions_by_id[rid] = {
                "id": rid,
                "code": f_props.get("code", rid[:6].upper()),
                "name": f_props.get("name", rid),
                "name_ar": f_props.get("name_ar", rid),
                "name_de": f_props.get("name_de", f_props.get("name", rid)),
                "name_fr": f_props.get("name_fr", f_props.get("name", rid)),
                "administrative_level": f_props.get("administrative_level", "governorate_delta_sector"),
                "country": f_props.get("country", "EG"),
                "countryCode": f_props.get("country", "EG"),
                "coordinates": [round(c.x, 4), round(c.y, 4)],
                "bbox": [round(x, 4) for x in b],
                "areaKm2": rep_area,
                "area_km2": rep_area,
                "clippedAreaKm2": calc_area,
                "climateZone": f_props.get("climate_zone", "Nile Delta Agricultural Sector"),
                "geometry": clipped_geom_json,
            }

        self._subregions_fc = {
            **self._subregions_fc,
            "features": clipped_features,
        }

    @property
    def study_polygon(self):
        return self._study_polygon

    def get_boundary_geojson(self) -> Dict[str, Any]:
        return self._boundary_fc

    def get_subregions_geojson(self) -> Dict[str, Any]:
        return self._subregions_fc

    def list_regions(self) -> List[Dict[str, Any]]:
        return list(self._regions_by_id.values())

    def get_region(self, region_id: str) -> Dict[str, Any]:
        if region_id in self._regions_by_id:
            return self._regions_by_id[region_id]
        # Default to nile_delta if legacy region id (e.g. 'egypt') is passed
        return self._regions_by_id["nile_delta"]

    def get_region_geometry(self, region_id: str, custom_geom: Optional[Dict[str, Any]] = None):
        if custom_geom:
            validated = self.validate_and_clip_custom_geometry(custom_geom)
            return shape(validated["feature"]["geometry"]), validated["region"]
        reg = self.get_region(region_id)
        return shape(reg["geometry"]), reg

    def validate_and_clip_custom_geometry(
        self, raw_geom: Dict[str, Any], name: str = "Custom Nile Delta Investigation Zone"
    ) -> Dict[str, Any]:
        """
        Validates a user-drawn Polygon/MultiPolygon or Feature/FeatureCollection against
        the Nile Delta study area boundary.
        Rejects geometries outside the study area or with insufficient satellite coverage.
        """
        if not raw_geom or not isinstance(raw_geom, dict):
            raise ValueError("Invalid GeoJSON input: geometry object is required.")

        g_type = raw_geom.get("type")
        if g_type == "FeatureCollection":
            feats = raw_geom.get("features", [])
            if not feats:
                raise ValueError("FeatureCollection contains no features.")
            geom_obj = shape(feats[0]["geometry"])
            name = feats[0].get("properties", {}).get("name", name)
        elif g_type == "Feature":
            geom_obj = shape(raw_geom["geometry"])
            name = raw_geom.get("properties", {}).get("name", name)
        elif g_type in ("Polygon", "MultiPolygon"):
            geom_obj = shape(raw_geom)
        else:
            raise ValueError(f"Unsupported geometry type '{g_type}'. Please draw a Polygon or Rectangle.")

        if not geom_obj.is_valid:
            geom_obj = make_valid(geom_obj)

        # Verify coordinate bounds are valid WGS84 lon/lat
        minx, miny, maxx, maxy = geom_obj.bounds
        if minx < -180 or maxx > 180 or miny < -90 or maxy > 90:
            raise ValueError("Coordinates out of EPSG:4326 bounds. Ensure [longitude, latitude] order.")

        # Clip to Nile Delta study boundary
        clipped = geom_obj.intersection(self._study_polygon)
        if clipped.is_empty or clipped.area == 0:
            raise ValueError(
                "Selected polygon lies outside the Nile Delta study area. "
                "Investigations are strictly restricted to the Nile Delta in Egypt."
            )

        # Extract polygonal components if geometry collection resulted
        if clipped.geom_type == "GeometryCollection":
            polys = [g for g in clipped.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
            if not polys:
                raise ValueError("Clipped geometry contains no valid polygon area inside the Nile Delta.")
            from shapely.ops import unary_union
            clipped = unary_union(polys)

        area_km2 = _compute_area_km2(clipped)
        original_area_km2 = _compute_area_km2(geom_obj)
        was_clipped = area_km2 < (original_area_km2 * 0.99)

        if area_km2 < 1.0:
            raise ValueError(
                f"Selected area ({area_km2:.2f} km²) has insufficient valid satellite coverage "
                "(minimum 1.0 km² required for MODIS 250 m NDVI & MOD11C3 0.05° LST analysis)."
            )

        geom_hash = hashlib.sha256(json.dumps(mapping(clipped), sort_keys=True).encode()).hexdigest()[:10]
        custom_id = f"custom_{geom_hash}"
        c = clipped.centroid
        b = [round(x, 4) for x in clipped.bounds]

        region_meta = {
            "id": custom_id,
            "code": f"ND-{geom_hash[:4].upper()}",
            "name": name,
            "name_ar": f"منطقة مخصصة ({name})",
            "name_de": f"Benutzerdefinierte Zone ({name})",
            "name_fr": f"Zone personnalisée ({name})",
            "administrative_level": "custom_polygon",
            "country": "EG",
            "countryCode": "EG",
            "coordinates": [round(c.x, 4), round(c.y, 4)],
            "bbox": b,
            "areaKm2": area_km2,
            "area_km2": area_km2,
            "climateZone": "User-Defined Nile Delta Investigation Polygon",
            "wasClipped": was_clipped,
            "lstCoverageWarning": area_km2 < 30.25,
            "geometry": mapping(clipped),
        }
        # Cache in memory so subsequent analysis calls by regionId find it
        self._regions_by_id[custom_id] = region_meta

        return {
            "valid": True,
            "wasClipped": was_clipped,
            "areaKm2": area_km2,
            "originalAreaKm2": original_area_km2,
            "coverageNote": (
                "Area is smaller than a single 0.05° × 0.05° (~30 km²) MODIS CMG LST cell; "
                "MOD11C3 Land Surface Temperature represents the intersecting 0.05° CMG grid cell."
                if area_km2 < 30.25
                else "Valid coverage for both MODIS 250 m NDVI and MOD11C3 0.05° Land Surface Temperature."
            ),
            "region": region_meta,
            "feature": {
                "type": "Feature",
                "id": custom_id,
                "properties": {
                    k: v for k, v in region_meta.items() if k != "geometry"
                },
                "geometry": mapping(clipped),
            },
        }


geography_service = GeographyService()

