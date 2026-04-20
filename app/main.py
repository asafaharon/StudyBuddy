import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ייבוא הראוטים
from app.api.endpoints import router as api_router

# ---------------------------------------------------------
# התיקון הקריטי: ייבוא ויצירת הטבלאות במסד הנתונים!
# ---------------------------------------------------------
from app.core.database import engine
from app.models import db_models

# פקודה זו מוודאת שקובץ ה-SQLite והטבלאות יווצרו כשהשרת עולה
db_models.Base.metadata.create_all(bind=engine)
# ---------------------------------------------------------

app = FastAPI(
    title="StudyBuddy ADK API",
    version="1.1.0",
    description="AI-powered study assistant using LangGraph and Gemini"
)

# 1. הגדרת CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. חיבור כל ה-Endpoints של ה-API
app.include_router(api_router, prefix="/api/v1")

# 3. נקודת בדיקת שפיות (Health Check)
@app.get("/api/health")
async def health_check():
    return {"status": "online", "service": "StudyBuddy ADK"}

# ---------------------------------------------------------
# התיקון לנתיבים הבטוחים של ה-Frontend
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "static")
HTML_PATH = os.path.join(BASE_DIR, "frontend", "index.html")

# יצירת התיקיות אוטומטית אם אינן קיימות כדי למנוע קריסת שרת
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

# 4. הפניית FastAPI לשרת קבצים סטטיים
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 5. הגשת מסך הבית
@app.get("/", include_in_schema=False)
async def serve_spa():
    return FileResponse(HTML_PATH)