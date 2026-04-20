from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# הגדרת נתיב לקובץ ה-SQLite מקומי בתיקיית הפרויקט
SQLALCHEMY_DATABASE_URL = "sqlite:///./studybuddy.db"

# connect_args={"check_same_thread": False} הוא קריטי ל-SQLite בסביבה אסינכרונית כמו FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# פונקציית תלות (Dependency) שנספק ל-Endpoints כדי לקבל גישה ל-DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()