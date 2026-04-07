# backend/api/v1/history.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.db import get_db
from services.history_service import history_service
from schemas.prediction import HistoryRecord, StatsResponse
from typing import List

router = APIRouter()

@router.get("/history", response_model=List[HistoryRecord])
def get_history(
    limit : int = Query(50,  ge=1, le=200),
    offset: int = Query(0,   ge=0),
    db    : Session = Depends(get_db)
):
    """Get past predictions, newest first."""
    return history_service.get_history(db, limit, offset)

@router.get("/history/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Get overall prediction statistics."""
    return history_service.get_stats(db)

@router.get("/history/{prediction_id}", response_model=HistoryRecord)
def get_single(prediction_id: int, db: Session = Depends(get_db)):
    """Get a single prediction by ID."""
    return history_service.get_single(db, prediction_id)

@router.delete("/history/{prediction_id}")
def delete_prediction(prediction_id: int, db: Session = Depends(get_db)):
    """Delete a prediction record."""
    return history_service.delete(db, prediction_id)