# backend/database/db.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
from database.models import Base
from core.logging_config import get_logger

logger = get_logger(__name__)

# create engine
# check_same_thread=False is required for SQLite + FastAPI
connect_args = (
    {"check_same_thread": False}
    if "sqlite" in settings.DATABASE_URL
    else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False       # set True to see raw SQL in terminal (useful for debugging)
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

def create_tables():
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified ✅")

# dependency injected into every route that needs DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()