# backend/api/v1/router.py

from fastapi import APIRouter
from api.v1 import predict, history

router = APIRouter(prefix="/api/v1")
router.include_router(predict.router, tags=["Prediction"])
router.include_router(history.router, tags=["History"])