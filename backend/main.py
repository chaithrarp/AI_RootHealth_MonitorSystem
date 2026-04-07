# backend/main.py

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from core.config import settings
from core.logging_config import setup_logging, get_logger
from database.db import create_tables
from api.v1.router import router
import time

# setup logging first
setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    logger.info("="*50)
    logger.info(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("="*50)
    create_tables()
    logger.info(f"  Device: {'CUDA' if __import__('torch').cuda.is_available() else 'CPU'}")
    logger.info("  Server ready ✅")
    yield
    # shutdown
    logger.info("Server shutting down...")

app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = "AI-powered hydroponic root health detection API",
    lifespan    = lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

# request timing middleware — logs how long each request takes
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} "
        f"[{duration:.1f}ms]"
    )
    return response

# global error handler — never expose raw tracebacks to frontend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}",
                 exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check logs."}
    )

# routes
app.include_router(router)

# health check
@app.get("/api/health", tags=["System"])
def health():
    return {
        "status" : "ok",
        "version": settings.APP_VERSION,
        "device" : "cuda" if __import__('torch').cuda.is_available() else "cpu"
    }