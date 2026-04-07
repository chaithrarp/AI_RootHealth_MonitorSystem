# backend/core/config.py

from pydantic_settings import BaseSettings
from pathlib import Path
import os

# root of the project (two levels up from this file)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # ── App ──────────────────────────────────────
    APP_NAME        : str  = "Root Health Monitor API"
    APP_VERSION     : str  = "1.0.0"
    DEBUG           : bool = True

    # ── Database ─────────────────────────────────
    # SQLite by default — to switch to PostgreSQL,
    # change this one line to:
    # "postgresql://user:password@localhost/roothealth"
    DATABASE_URL    : str  = f"sqlite:///{ROOT_DIR}/backend/database/predictions.db"

    # ── ML Models ────────────────────────────────
    MODEL_DIR       : Path = ROOT_DIR / "ml" / "models"
    IMAGE_MODEL     : str  = "best_model_finetuned.pt"
    SENSOR_MODEL    : str  = "sensor_model.pt"
    FUSION_HEAD     : str  = "fusion_head.pt"
    SENSOR_SCALER   : str  = "sensor_scaler.pkl"
    FUSION_CONFIG   : str  = "fusion_config.json"

    # ── Prediction ───────────────────────────────
    IMAGE_SIZE      : int  = 224
    MAX_IMAGE_SIZE  : int  = 20 * 1024 * 1024   # 20MB max upload
    ALLOWED_TYPES   : list = ["image/jpeg", "image/png", "image/jpg"]

    # ── CORS ─────────────────────────────────────
    ALLOWED_ORIGINS : list = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # fallback
    ]

    class Config:
        env_file = ".env"          # override any setting via .env file

# single instance used everywhere
settings = Settings()