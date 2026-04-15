# backend/schemas/prediction.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


# ── incoming sensor data ──────────────────────────────────────────────────────
class SensorInput(BaseModel):
    ph               : float = Field(..., ge=0.0,   le=14.0,   description="pH level 0–14")
    tds              : float = Field(..., ge=0.0,   le=5000.0, description="TDS in ppm")
    water_temp       : float = Field(..., ge=0.0,   le=50.0,   description="Water temp °C")
    humidity         : float = Field(..., ge=0.0,   le=100.0,  description="Humidity %")
    dissolved_oxygen : float = Field(..., ge=0.0,   le=20.0,   description="DO mg/L")

    @validator("ph")
    def ph_realistic(cls, v):
        if not (3.0 <= v <= 10.0):
            raise ValueError("pH must be between 3.0 and 10.0 for hydroponics")
        return v

    @validator("water_temp")
    def temp_realistic(cls, v):
        if not (5.0 <= v <= 45.0):
            raise ValueError("Water temperature must be between 5°C and 45°C")
        return v


# ── shared sub-models ─────────────────────────────────────────────────────────
class Probabilities(BaseModel):
    healthy:  float
    diseased: float


class SensorAttribution(BaseModel):
    key:       str
    label:     str
    value:     float
    unit:      str
    direction: str    # "normal" | "low" | "high"
    deviation: float  # 0–1, how far outside healthy range
    range_lo:  float
    range_hi:  float


# ── prediction response ───────────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    id:            int
    prediction:    str
    confidence:    float
    image_score:   Optional[float]
    sensor_score:  Optional[float]
    probabilities: Probabilities
    mode:          str
    timestamp:     datetime

    gradcam_overlay:     Optional[str]                   = None
    sensor_attributions: Optional[List[SensorAttribution]] = None

    class Config:
        from_attributes = True


# ── history record (includes sensor readings snapshot) ───────────────────────
class SensorReadings(BaseModel):
    ph:               Optional[float] = None
    tds:              Optional[float] = None
    water_temp:       Optional[float] = None
    humidity:         Optional[float] = None
    dissolved_oxygen: Optional[float] = None


class HistoryRecord(BaseModel):
    id:            int
    prediction:    str
    confidence:    float
    image_score: Optional[float] = None   # ← fix
    sensor_score: Optional[float] = None
    probabilities: Probabilities
    mode:          str
    timestamp:     datetime
    sensor_readings: Optional[SensorReadings] = None

    class Config:
        from_attributes = True


# ── stats response ────────────────────────────────────────────────────────────
class StatsResponse(BaseModel):
    total_scans:        int
    disease_rate:       float
    healthy_count:      int
    diseased_count:     int
    average_confidence: float