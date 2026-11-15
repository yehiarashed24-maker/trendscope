import os
import json
import base64
import datetime
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
BOUNDARIES_DIR = DATA_DIR / "boundaries"
CACHE_DIR = DATA_DIR / "cache"
RASTERS_DIR = DATA_DIR / "rasters"
DB_PATH = DATA_DIR / "investigations.db"

for d in [DATA_DIR, BOUNDARIES_DIR, CACHE_DIR, RASTERS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Load backend/.env first, fallback to root .env
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BASE_DIR / ".env")


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("VITE_GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
    NASA_API_KEY: str = os.getenv("NASA_API_KEY", "") or os.getenv("VITE_NASA_API_KEY", "")
    EARTHDATA_TOKEN: str = os.getenv("EARTHDATA_TOKEN", "") or os.getenv("VITE_EARTHDATA_TOKEN", "")
    EARTHDATA_USERNAME: str = os.getenv("EARTHDATA_USERNAME", "") or os.getenv("VITE_EARTHDATA_USERNAME", "")
    MAPTILER_API_KEY: str = os.getenv("MAPTILER_API_KEY", "") or os.getenv("VITE_MAPTILER_API_KEY", "")

    @classmethod
    def inspect_earthdata_token(cls) -> dict:
        token = cls.EARTHDATA_TOKEN.strip()
        if not token:
            return {
                "configured": False,
                "valid_format": False,
                "expired": True,
                "uid": None,
                "expires_at": None,
                "message": "EARTHDATA_TOKEN is not set. Generate a 60-day Bearer token at https://urs.earthdata.nasa.gov/profile",
            }
        parts = token.split(".")
        if len(parts) != 3 or len(token) < 50:
            return {
                "configured": True,
                "valid_format": False,
                "expired": True,
                "uid": None,
                "expires_at": None,
                "message": "Configured value is not a valid Earthdata JWT Bearer token (a username alone is not a token). Generate a User Token at https://urs.earthdata.nasa.gov",
            }
        try:
            payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
            exp = payload.get("exp")
            uid = payload.get("uid")
            now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
            expired = bool(exp and exp < now_ts)
            exp_iso = (
                datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).isoformat()
                if exp
                else None
            )
            return {
                "configured": True,
                "valid_format": True,
                "expired": expired,
                "uid": uid,
                "expires_at": exp_iso,
                "message": "Valid Earthdata JWT token" if not expired else f"Earthdata token expired on {exp_iso}",
            }
        except Exception as exc:
            return {
                "configured": True,
                "valid_format": False,
                "expired": True,
                "uid": None,
                "expires_at": None,
                "message": f"Failed to decode Earthdata JWT claims: {exc}",
            }


settings = Settings()

