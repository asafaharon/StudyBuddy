from pydantic import BaseModel, Field
from typing import List, Optional

class QuestionBase(BaseModel):
    type: str = Field(..., description="'multiple_choice' or 'open_ended'")
    question_text: str
    options: List[str] = Field(default_factory=list, description="רשימת אפשרויות לשאלות אמריקאיות")
    correct_answer: str
    explanation: str = Field(..., description="הסבר מבוסס מקור לתשובה הנכונה")
    difficulty: int = Field(ge=1, le=5)

class TopicBlueprint(BaseModel):
    topic_name: str = Field(..., description="שם הנושא המרכזי")
    focus_area: str = Field(..., description="במה בדיוק צריך להתמקד בשאלות על נושא זה")
    num_questions: int = Field(..., description="כמות השאלות שיוקצו לנושא זה")
    difficulty_level: str = Field(..., description="רמת הקושי המומלצת (למשל: 'קל-בינוני', 'מאתגר')")

class ExamBlueprint(BaseModel):
    topics: List[TopicBlueprint] = Field(..., description="רשימת הנושאים למבחן")
    total_questions: int = Field(..., description="סך כל השאלות במבחן")
    general_instructions: str = Field(..., description="הנחיות כלליות שיעברו לפרופסור שכותב את השאלות")

class Question(QuestionBase):
    id: str

class Exam(BaseModel):
    id: str
    title: str
    questions: List[Question]
    source_material_summary: Optional[str] = None

class ExamCreateRequest(BaseModel):
    session_id: str
    custom_instructions: Optional[str] = None

class QuestionList(BaseModel):
    questions: List[QuestionBase] = Field(..., description="רשימת השאלות שנוצרו")


class ReviewResult(BaseModel):
    is_approved: bool = Field(..., description="האם המבחן תקין ועומד בכל הכללים? True או False")
    feedback: str = Field(..., description="אם המבחן נפסל, פירוט מדויק של מה שצריך לתקן. אם הוא אושר, כתוב 'Looks good'.")