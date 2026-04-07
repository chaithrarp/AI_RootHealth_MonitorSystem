from sqlalchemy import desc, func
from database.models import Prediction
from core.logging_config import get_logger
from sqlalchemy.orm import Session
from typing import Optional

logger = get_logger(__name__)

class PredictionRepository:

    def create(self, db: Session, data: dict) -> Prediction:
        record = Prediction(**data)
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info(f"Saved prediction id={record.id} label={record.prediction}")
        return record

    def get_all(self, db: Session, limit: int = 50, offset: int = 0):
        rows = (
            db.query(Prediction)
            .order_by(desc(Prediction.timestamp))
            .offset(offset)
            .limit(limit)
            .all()
        )
        # Attach a synthetic probabilities dict so HistoryRecord can serialize it
        for r in rows:
            ph = r.prob_healthy  if r.prob_healthy  is not None else (1 - r.confidence if r.prediction == "diseased" else r.confidence)
            pd = r.prob_diseased if r.prob_diseased is not None else (r.confidence if r.prediction == "diseased" else 1 - r.confidence)
            r.probabilities = {"healthy": round(ph, 4), "diseased": round(pd, 4)}
            # Reconstruct sensor_readings sub-object
            r.sensor_readings = (
                {
                    "ph": r.ph, "tds": r.tds, "water_temp": r.water_temp,
                    "humidity": r.humidity, "dissolved_oxygen": r.dissolved_oxygen,
                }
                if any(v is not None for v in [r.ph, r.tds, r.water_temp, r.humidity, r.dissolved_oxygen])
                else None
            )
        return rows

    def get_by_id(self, db: Session, prediction_id: int) -> Optional[Prediction]:
        row = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if row:
            ph = row.prob_healthy  if row.prob_healthy  is not None else (1 - row.confidence if row.prediction == "diseased" else row.confidence)
            pd = row.prob_diseased if row.prob_diseased is not None else (row.confidence if row.prediction == "diseased" else 1 - row.confidence)
            row.probabilities  = {"healthy": round(ph, 4), "diseased": round(pd, 4)}
            row.sensor_readings = (
                {"ph": row.ph, "tds": row.tds, "water_temp": row.water_temp,
                 "humidity": row.humidity, "dissolved_oxygen": row.dissolved_oxygen}
                if any(v is not None for v in [row.ph, row.tds, row.water_temp, row.humidity, row.dissolved_oxygen])
                else None
            )
        return row

    def get_stats(self, db: Session) -> dict:
        total    = db.query(Prediction).count()
        diseased = db.query(Prediction).filter(Prediction.prediction == "diseased").count()
        healthy  = total - diseased
        avg_conf = db.query(func.avg(Prediction.confidence)).scalar() or 0.0
        return {
            "total_scans"       : total,
            "healthy_count"     : healthy,
            "diseased_count"    : diseased,
            "disease_rate"      : round(diseased / total, 4) if total > 0 else 0.0,
            "average_confidence": round(avg_conf, 4),
        }

    def delete_by_id(self, db: Session, prediction_id: int) -> bool:
        record = self.get_by_id(db, prediction_id)
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True

prediction_repo = PredictionRepository()