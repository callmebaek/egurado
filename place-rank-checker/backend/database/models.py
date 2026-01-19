"""
데이터베이스 모델
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Place(Base):
    """플레이스 정보"""
    __tablename__ = "places"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String(50), unique=True, nullable=False, index=True)
    place_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 관계
    keywords = relationship("Keyword", back_populates="place", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Place {self.place_id}: {self.place_name}>"


class Keyword(Base):
    """키워드 정보"""
    __tablename__ = "keywords"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # 관계
    place = relationship("Place", back_populates="keywords")
    rank_histories = relationship("RankHistory", back_populates="keyword", cascade="all, delete-orphan")
    
    # 복합 인덱스 (place_id + keyword)
    __table_args__ = (
        Index('idx_place_keyword', 'place_id', 'keyword'),
    )
    
    def __repr__(self):
        return f"<Keyword {self.keyword} for place_id={self.place_id}>"


class RankHistory(Base):
    """순위 기록"""
    __tablename__ = "rank_history"
    
    id = Column(Integer, primary_key=True, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False)
    rank = Column(Integer, default=0)  # 0 = 순위 없음
    blog_review_count = Column(Integer, default=0)
    visitor_review_count = Column(Integer, default=0)
    save_count = Column(Integer, default=0)
    checked_at = Column(DateTime, default=datetime.now, index=True)
    
    # 관계
    keyword = relationship("Keyword", back_populates="rank_histories")
    
    # 복합 인덱스 (keyword_id + checked_at)
    __table_args__ = (
        Index('idx_keyword_checked', 'keyword_id', 'checked_at'),
    )
    
    def __repr__(self):
        return f"<RankHistory keyword_id={self.keyword_id} rank={self.rank} at {self.checked_at}>"
