# backend/services/history_service.py

from sqlalchemy.orm import Session
from repositories.prediction_repo import prediction_repo
from fastapi import HTTPException
from core.logging_config import get_logger

logger = get_logger(__name__)

class HistoryService:

    def get_history(self, db: Session,
                    limit: int = 50,
                    offset: int = 0) -> list:
        limit  = min(limit, 200)   # cap at 200 max
        offset = max(offset, 0)
        return prediction_repo.get_all(db, limit, offset)

    def get_stats(self, db: Session) -> dict:
        return prediction_repo.get_stats(db)

    def get_single(self, db: Session,
                   prediction_id: int):
        record = prediction_repo.get_by_id(db, prediction_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Prediction {prediction_id} not found"
            )
        return record

    def delete(self, db: Session,
               prediction_id: int) -> dict:
        success = prediction_repo.delete_by_id(db, prediction_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Prediction {prediction_id} not found"
            )
        logger.info(f"Deleted prediction id={prediction_id}")
        return {"message": f"Prediction {prediction_id} deleted"}

history_service = HistoryService()