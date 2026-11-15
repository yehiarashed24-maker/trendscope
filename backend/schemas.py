from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

SupportedLanguage = Literal["en", "ar", "de", "fr"]
VariableId = Literal["ndvi", "lst"]
LstMode = Literal["day", "night", "both"]
DatasetId = Literal["MODIS_MOD13Q1", "MODIS_MOD11C3"]
TemporalAggregation = Literal["daily", "monthly", "seasonal", "annual"]
DataIntegrityStatus = Literal["VERIFIED", "DEMO_DATA", "UNAVAILABLE", "PENDING_BACKEND"]


class TimeRangeSchema(BaseModel):
    startDate: str = "2000-02-18"
    endDate: str = "2024-12-31"
    aggregation: TemporalAggregation = "monthly"


class InvestigationConfigSchema(BaseModel):
    id: str = "inv_nile_delta_ndvi"
    titleKey: Optional[str] = None
    customTitle: Optional[str] = None
    regionId: str = "nile_delta"
    variableId: VariableId = "ndvi"
    lstMode: LstMode = "day"
    secondaryVariableId: Optional[VariableId] = None
    datasetId: str = "MODIS_MOD13Q1"
    timeRange: TimeRangeSchema = Field(default_factory=TimeRangeSchema)
    customGeoJson: Optional[Dict[str, Any]] = None
    createdAt: str = "2026-11-12T00:00:00Z"
    status: DataIntegrityStatus = "VERIFIED"


class CustomRegionRequest(BaseModel):
    name: Optional[str] = "Custom Nile Delta Area"
    geometry: Dict[str, Any]


class RasterStatsRequest(BaseModel):
    regionId: str = "nile_delta"
    variableId: VariableId = "ndvi"
    lstMode: LstMode = "day"
    date: Optional[str] = None
    customGeometry: Optional[Dict[str, Any]] = None


class TrendAnalysisRequest(BaseModel):
    config: InvestigationConfigSchema


class CorrelationRequest(BaseModel):
    regionId: str = "nile_delta"
    varX: VariableId = "ndvi"
    varY: VariableId = "lst"
    lstMode: LstMode = "day"
    timeRange: TimeRangeSchema = Field(default_factory=TimeRangeSchema)
    customGeometry: Optional[Dict[str, Any]] = None


class AnomalyRequest(BaseModel):
    regionId: str = "nile_delta"
    variableId: Optional[VariableId] = None
    lstMode: LstMode = "day"
    timeRange: Optional[TimeRangeSchema] = None


class CombinedInvestigationRequest(BaseModel):
    regionId: str = "nile_delta"
    lstMode: LstMode = "day"
    timeRange: TimeRangeSchema = Field(default_factory=TimeRangeSchema)
    customGeometry: Optional[Dict[str, Any]] = None


class AiExplainRequest(BaseModel):
    prompt: str
    language: SupportedLanguage = "en"
    regionId: str = "nile_delta"
    variableId: VariableId = "ndvi"
    lstMode: LstMode = "day"
    timeRange: Optional[TimeRangeSchema] = None
    contextMetrics: Optional[Dict[str, Any]] = None

