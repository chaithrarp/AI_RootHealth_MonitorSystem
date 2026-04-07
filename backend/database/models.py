# backend/database/models.py

from sqlalchemy import (Column, Integer, Float,
                        String, DateTime, Enum)
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class PredictionMode(str, enum.Enum):
    image_only = "image_only"
    fusion     = "fusion"

class PredictionLabel(str, enum.Enum):
    healthy  = "healthy"
    diseased = "diseased"

class Prediction(Base):
    __tablename__ = "predictions"

    id               = Column(Integer, primary_key=True, index=True)
    timestamp        = Column(DateTime, default=datetime.utcnow, index=True)

    # results
    prediction       = Column(String, nullable=False)
    confidence       = Column(Float,  nullable=False)
    image_score      = Column(Float,  nullable=False)
    sensor_score     = Column(Float,  nullable=True)
    prob_healthy  = Column(Float, nullable=True)
    prob_diseased = Column(Float, nullable=True)
    mode             = Column(String, default="fusion")

    # sensor readings (nullable — not always provided)
    ph               = Column(Float, nullable=True)
    tds              = Column(Float, nullable=True)
    water_temp       = Column(Float, nullable=True)
    humidity         = Column(Float, nullable=True)
    dissolved_oxygen = Column(Float, nullable=True)

    # image info
    image_filename   = Column(String, nullable=True)
    image_size_bytes = Column(Integer, nullable=True)

    def __repr__(self):
        return (f"<Prediction id={self.id} "
                f"label={self.prediction} "
                f"confidence={self.confidence:.2f}>")