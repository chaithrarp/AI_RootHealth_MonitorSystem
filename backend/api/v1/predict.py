# backend/api/v1/predict.py

from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from services.prediction_service import prediction_service
from schemas.prediction import PredictionResponse
from typing import Optional

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
async def predict(
    image       : UploadFile       = File(..., description="Root image (JPG/PNG)"),
    sensor_data : Optional[str]    = Form(None, description="JSON sensor readings"),
    db          : Session          = Depends(get_db)
):
    """
    Run root health prediction.
    - **image**: JPG or PNG of the root system
    - **sensor_data**: optional JSON with ph, tds, water_temp, humidity, dissolved_oxygen
    """
    return await prediction_service.run_prediction(image, sensor_data, db)