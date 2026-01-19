"""
데이터베이스 연결 및 세션 관리
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from loguru import logger

from .models import Base


# 데이터베이스 URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://placerank:placerank123@localhost:5432/placerank"
)

# SQLite 지원 (개발용)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """데이터베이스 초기화 (테이블 생성)"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.success("✓ 데이터베이스 테이블 생성 완료")
    except Exception as e:
        logger.error(f"✗ 데이터베이스 초기화 실패: {e}")
        raise


def get_db() -> Session:
    """데이터베이스 세션 생성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
