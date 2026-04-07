# backend/services/prediction_service.py

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from ml_engine.predictor import predictor
from repositories.prediction_repo import prediction_repo
from schemas.prediction import SensorInput
from core.config import settings
from core.logging_config import get_logger
from typing import Optional
import json

logger = get_logger(__name__)

class PredictionService:

    async def run_prediction(
        self,
        image      : UploadFile,
        sensor_json: Optional[str],
        db         : Session
    ) -> dict:

        # ── validate image ──────────────────────────
        if image.content_type not in settings.ALLOWED_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported image type: {image.content_type}. "
                       f"Allowed: {settings.ALLOWED_TYPES}"
            )

        image_bytes = await image.read()

        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Image file is empty"
            )

        if len(image_bytes) > settings.MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Image too large. Max size: "
                       f"{settings.MAX_IMAGE_SIZE // (1024*1024)}MB"
            )

        logger.info(f"Processing image: {image.filename} "
                    f"({len(image_bytes)/1024:.1f}KB) "
                    f"sensor={'yes' if sensor_json else 'no'}")

        # ── run prediction ──────────────────────────
        if sensor_json:
            try:
                raw     = json.loads(sensor_json)
                sensor  = SensorInput(**raw)  # validates ranges
                result  = predictor.predict_fusion(
                    image_bytes, sensor.dict()
                )
                sensor_dict = sensor.dict()
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid JSON in sensor_data field"
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Sensor validation error: {str(e)}"
                )
        else:
            result      = predictor.predict_image_only(image_bytes)
            sensor_dict = {}

        # ── save to database ────────────────────────
        record = prediction_repo.create(db, {
            "prediction"      : result["prediction"],
            "confidence"      : result["confidence"],
            "image_score"     : result["image_score"],
            "sensor_score"    : result.get("sensor_score"),
            "prob_healthy" : result["probabilities"]["healthy"],
            "prob_diseased": result["probabilities"]["diseased"],
            "mode"            : result["mode"],
            "image_filename"  : image.filename,
            "image_size_bytes": len(image_bytes),
            **{k: sensor_dict.get(k) for k in [
                "ph", "tds", "water_temp",
                "humidity", "dissolved_oxygen"
            ]}
        })

        return {
            "id"                 : record.id,
            "prediction"         : result["prediction"],
            "confidence"         : result["confidence"],
            "image_score"        : result["image_score"],
            "sensor_score"       : result.get("sensor_score"),
            "probabilities"      : result["probabilities"],
            "mode"               : result["mode"],
            "timestamp"          : record.timestamp,
            "gradcam_overlay"    : result.get("gradcam_overlay"),
            "sensor_attributions": result.get("sensor_attributions"),
        }

prediction_service = PredictionService()