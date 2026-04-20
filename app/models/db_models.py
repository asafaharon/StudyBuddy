from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
import json
from app.core.database import Base


class DBExam(Base):
    __tablename__ = "exams"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    source_material_summary = Column(String, nullable=True)

    # קשר של יחיד לרבים: מבחן אחד מכיל הרבה שאלות
    questions = relationship("DBQuestion", back_populates="exam", cascade="all, delete")


class DBQuestion(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"))
    type = Column(String)  # "multiple_choice" or "open_ended"
    question_text = Column(String)

    # SQLite לא תומך במערכים (Arrays) באופן טבעי, לכן נשמור את האפשרויות כ-JSON String
    _options = Column("options", String)

    correct_answer = Column(String)
    explanation = Column(String)
    difficulty = Column(Integer)

    exam = relationship("DBExam", back_populates="questions")

    # Property Methods כדי לעבוד בנוחות עם רשימת האפשרויות
    @property
    def options(self):
        return json.loads(self._options) if self._options else []

    @options.setter
    def options(self, value):
        self._options = json.dumps(value)