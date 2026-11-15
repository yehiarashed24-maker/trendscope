import json
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS investigations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                region_id TEXT NOT NULL,
                variable_id TEXT NOT NULL,
                secondary_variable_id TEXT,
                dataset_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                aggregation TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.commit()

        cur = conn.execute("SELECT COUNT(*) as cnt FROM investigations")
        cnt = cur.fetchone()["cnt"]
        if cnt == 0:
            seed_default_investigations(conn)
        else:
            # Remove legacy SMAP seed row and replace/upgrade if needed
            conn.execute("DELETE FROM investigations WHERE id = 'inv_kafr_el_sheikh_smap' OR variable_id = 'soil_moisture'")
            seed_default_investigations(conn)
    finally:
        conn.close()


def seed_default_investigations(conn: sqlite3.Connection) -> None:
    defaults = [
        {
            "id": "inv_nile_delta_ndvi_core",
            "customTitle": "Nile Delta Regional Vegetation Dynamics (MOD13Q1 250m)",
            "regionId": "nile_delta",
            "variableId": "ndvi",
            "secondaryVariableId": "lst",
            "lstMode": "day",
            "datasetId": "MODIS_MOD13Q1",
            "timeRange": {"startDate": "2000-02-18", "endDate": "2024-12-31", "aggregation": "monthly"},
            "createdAt": "2026-11-10T09:00:00Z",
            "status": "VERIFIED",
        },
        {
            "id": "inv_kafr_el_sheikh_lst",
            "customTitle": "Kafr El-Sheikh Surface Thermal Regime: Daytime vs Nighttime LST (MOD11C3)",
            "regionId": "kafr_el_sheikh",
            "variableId": "lst",
            "lstMode": "both",
            "secondaryVariableId": "ndvi",
            "datasetId": "MODIS_MOD11C3",
            "timeRange": {"startDate": "2000-02-18", "endDate": "2024-12-31", "aggregation": "monthly"},
            "createdAt": "2026-11-11T12:30:00Z",
            "status": "VERIFIED",
        },
        {
            "id": "inv_beheira_west_reclamation",
            "customTitle": "West Delta (Beheira / Nubariya) Agricultural Expansion NDVI Assessment",
            "regionId": "beheira_delta",
            "variableId": "ndvi",
            "secondaryVariableId": "lst",
            "lstMode": "day",
            "datasetId": "MODIS_MOD13Q1",
            "timeRange": {"startDate": "2005-01-01", "endDate": "2024-12-31", "aggregation": "monthly"},
            "createdAt": "2026-11-11T15:45:00Z",
            "status": "VERIFIED",
        },
    ]
    for item in defaults:
        conn.execute(
            """
            INSERT OR IGNORE INTO investigations
            (id, title, region_id, variable_id, secondary_variable_id, dataset_id, start_date, end_date, aggregation, status, created_at, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["customTitle"],
                item["regionId"],
                item["variableId"],
                item.get("secondaryVariableId"),
                item["datasetId"],
                item["timeRange"]["startDate"],
                item["timeRange"]["endDate"],
                item["timeRange"]["aggregation"],
                item["status"],
                item["createdAt"],
                json.dumps(item),
            ),
        )
    conn.commit()


def list_investigations() -> List[Dict[str, Any]]:
    init_db()
    conn = _get_conn()
    try:
        rows = conn.execute("SELECT payload_json FROM investigations ORDER BY created_at DESC").fetchall()
        return [json.loads(r["payload_json"]) for r in rows]
    finally:
        conn.close()


def get_investigation(inv_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    conn = _get_conn()
    try:
        row = conn.execute("SELECT payload_json FROM investigations WHERE id = ?", (inv_id,)).fetchone()
        return json.loads(row["payload_json"]) if row else None
    finally:
        conn.close()


def save_investigation(config: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    inv_id = config.get("id") or f"inv_{int(datetime.now(timezone.utc).timestamp())}"
    title = config.get("customTitle") or config.get("titleKey") or f"Nile Delta Investigation ({config.get('regionId', 'nile_delta')})"
    region_id = config.get("regionId", "nile_delta")
    variable_id = config.get("variableId", "ndvi")
    if variable_id not in ("ndvi", "lst"):
        variable_id = "ndvi"
    secondary_var = config.get("secondaryVariableId")
    if secondary_var not in ("ndvi", "lst", None):
        secondary_var = "lst" if variable_id == "ndvi" else "ndvi"
    dataset_id = config.get("datasetId") or ("MODIS_MOD13Q1" if variable_id == "ndvi" else "MODIS_MOD11C3")
    if dataset_id == "SMAP_SPL3SMP_E":
        dataset_id = "MODIS_MOD11C3"
    tr = config.get("timeRange") or {"startDate": "2000-02-18", "endDate": "2024-12-31", "aggregation": "monthly"}
    status = config.get("status", "VERIFIED")
    created_at = config.get("createdAt") or now_iso

    record = {
        **config,
        "id": inv_id,
        "customTitle": title,
        "regionId": region_id,
        "variableId": variable_id,
        "secondaryVariableId": secondary_var,
        "datasetId": dataset_id,
        "timeRange": tr,
        "status": status,
        "createdAt": created_at,
    }

    conn = _get_conn()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO investigations
            (id, title, region_id, variable_id, secondary_variable_id, dataset_id, start_date, end_date, aggregation, status, created_at, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                inv_id,
                title,
                region_id,
                variable_id,
                secondary_var,
                dataset_id,
                tr.get("startDate", "2015-04-01"),
                tr.get("endDate", "2024-12-31"),
                tr.get("aggregation", "monthly"),
                status,
                created_at,
                json.dumps(record),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return record


def delete_investigation(inv_id: str) -> bool:
    init_db()
    conn = _get_conn()
    try:
        cur = conn.execute("DELETE FROM investigations WHERE id = ?", (inv_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()

