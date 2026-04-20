from typing import TypedDict, List, Optional


class GraphState(TypedDict):
    """
    זהו ה"זיכרון" המשותף של כל הסוכנים בזמן ריצת יצירת המבחן.
    כל סוכן קורא מפה נתונים, ומעדכן שדות רלוונטיים.
    """
    session_id: str
    source_text: str  # הטקסט הגולמי שחולץ מהקבצים (ע"י ה-Librarian)
    custom_instructions: Optional[str]  # בקשות מיוחדות מהמשתמש

    blueprint: Optional[dict]  # לכאן ה-Architect יכניס את התוכנית שלו
    questions: List[dict]  # לכאן ה-Generator יכניס את השאלות

    review_feedback: Optional[str]  # הערות של ה-Reviewer לתיקון
    iteration_count: int  # מונה למניעת לולאה אינסופית בתיקונים