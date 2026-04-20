from app.agents.states import GraphState
from app.services.gemini_service import generate_structured_json
from app.models.schemas import ExamBlueprint
import json
from app.agents.states import GraphState
from app.services.gemini_service import generate_structured_json
from app.models.schemas import QuestionList
from app.models.schemas import ReviewResult

async def curriculum_planner_node(state: GraphState) -> dict:
    """
    The Architect Agent:
    מנתח את חומר המקור ויוצר תוכנית חלוקת שאלות (Blueprint).
    """
    print("--- 🏗️ AGENT: The Architect is planning the exam ---")

    source_text = state["source_text"]
    custom_instructions = state.get("custom_instructions", "אין הנחיות מיוחדות מהמשתמש.")

    # System Instructions - ההנחיות הקשיחות של הסוכן
    system_instruction = f"""
    You are 'The Architect', an expert academic curriculum planner.
    Your job is to analyze the provided study material and design a structured blueprint for an exam.

    Rules:
    1. Identify the core concepts in the material.
    2. Distribute questions logically across these concepts to ensure full coverage.
    3. You must follow the student's custom instructions if provided.
    4. The total number of questions should typically be between 5 and 10, unless requested otherwise.

    You MUST return your response as a valid JSON matching this exact Pydantic schema structure:
    {ExamBlueprint.model_json_schema()}
    """

    # הפרומפט הספציפי לריצה הנוכחית
    prompt = f"""
    Source Material to analyze:
    {source_text}

    Student's Custom Instructions:
    {custom_instructions}

    Please generate the exam blueprint JSON.
    """

    # קריאה ל-Gemini דרך הסרוויס שבנינו (שמבטיח JSON תקין)
    try:
        blueprint_result = await generate_structured_json(
            prompt=prompt,
            system_instruction=system_instruction
        )

        # אנחנו מחזירים רק את השדות שאנחנו רוצים לעדכן ב-State
        return {"blueprint": blueprint_result}

    except Exception as e:
        print(f"Architect Agent failed: {e}")
        # במערכת אמיתית היינו מנהלים פה שגיאה, לבינתיים נחזיר הערה ל-State
        return {"blueprint": None, "review_feedback": "Failed to generate blueprint"}


async def generator_node(state: GraphState) -> dict:
    """
    The Professor Agent:
    קורא את ה-Blueprint וכותב את השאלות בפועל מתוך חומר המקור.
    """
    print("--- ✍️ AGENT: The Professor is drafting questions ---")

    source_text = state["source_text"]
    blueprint = state.get("blueprint")
    review_feedback = state.get("review_feedback")  # אם הסוכן המבקר החזיר אותו לתיקון

    # Fail-Fast: אם אין תוכנית, אי אפשר לכתוב מבחן
    if not blueprint:
        print("Error: No blueprint found in state.")
        return {"questions": []}

    # System Instructions - הגדרת דמות הפרופסור הקפדן
    system_instruction = f"""
    You are 'The Professor', an elite academic test creator.
    Your objective is to generate exam questions strictly based on the provided Exam Blueprint.

    CRITICAL RULES:
    1. ZERO HALLUCINATIONS: Every question, correct answer, and explanation MUST be derived EXCLUSIVELY from the provided Source Material.
    2. DISTRACTORS: For multiple-choice questions, the incorrect options (distractors) must be plausible but definitively wrong according to the text.
    3. EXPLANATIONS: Provide a clear explanation for the correct answer, referencing concepts from the source material.
    4. FOLLOW THE BLUEPRINT: You must adhere to the topics, focus areas, and difficulty levels specified in the blueprint.

    You MUST return your response as a valid JSON matching this exact Pydantic schema:
    {QuestionList.model_json_schema()}
    """

    # בניית הפרומפט: נזין לו את חומר המקור, את התוכנית, ואת הערות המבקר (אם יש)
    prompt = f"""
    Source Material:
    {source_text}

    Exam Blueprint (Follow this strictly):
    {json.dumps(blueprint, ensure_ascii=False, indent=2)}
    """

    # אם יש הערות מה-Reviewer (למשל: "שאלה 3 קשה מדי, שנה אותה"), נוסיף אותן לפרומפט!
    if review_feedback:
        print(f"   -> Professor is revising based on feedback: {review_feedback}")
        prompt += f"\n\nCRITICAL FEEDBACK FROM REVIEWER (Please revise accordingly):\n{review_feedback}"

    try:
        questions_result = await generate_structured_json(
            prompt=prompt,
            system_instruction=system_instruction
        )

        # אנחנו מחזירים רק את מערך השאלות כדי לעדכן את ה-State
        return {"questions": questions_result.get("questions", [])}

    except Exception as e:
        print(f"Professor Agent failed: {e}")
        return {"questions": []}


async def reviewer_node(state: GraphState) -> dict:
    """
    The Critic Agent:
    בודק את השאלות שנוצרו מול חומר המקור ומוודא שאין טעויות, הזיות או חריגות מהתוכנית.
    """
    print("--- 🔍 AGENT: The Critic is reviewing the exam ---")

    source_text = state["source_text"]
    blueprint = state.get("blueprint")
    questions = state.get("questions", [])
    iteration_count = state.get("iteration_count", 0)

    # הגנה מפני לולאה אינסופית (Best Practice!)
    if iteration_count >= 3:
        print("⚠️ Max iterations reached. Forcing approval to prevent infinite loop.")
        return {
            "review_feedback": "Max iterations reached. Approved by default.",
            "iteration_count": iteration_count + 1
            # הערה: במערכת אמיתית אולי נחזיר שגיאה ללקוח, אבל פה נשחרר את התוצאה
        }

    system_instruction = f"""
    You are 'The Critic', a rigorous quality assurance AI for academic exams.
    Your job is to review the questions generated by 'The Professor'.

    CRITERIA FOR REJECTION (is_approved = false):
    1. A question contains facts NOT found in the Source Material.
    2. A correct answer is actually wrong or ambiguous.
    3. The distractors (wrong options) are too obvious or grammatically incorrect.
    4. The questions do not match the required focus areas in the Blueprint.

    If ANY criteria fail, set 'is_approved' to false and write EXPLICIT feedback on what to fix (e.g., "Question 2 introduces a concept not in the text. Replace it.").
    If everything is perfect, set 'is_approved' to true.

    You MUST return your response as a valid JSON matching this exact Pydantic schema:
    {ReviewResult.model_json_schema()}
    """

    prompt = f"""
    Source Material:
    {source_text}

    Exam Blueprint:
    {json.dumps(blueprint, ensure_ascii=False)}

    Generated Questions to Review:
    {json.dumps([q for q in questions], ensure_ascii=False, indent=2)}
    """

    try:
        review_result = await generate_structured_json(
            prompt=prompt,
            system_instruction=system_instruction
        )

        is_approved = review_result.get("is_approved", True)
        feedback = review_result.get("feedback", "Looks good")

        if is_approved:
            print("   ✅ The Critic approved the exam!")
            # ננקה את הפידבק כדי שהגרף יידע להמשיך הלאה
            return {"review_feedback": "APPROVED", "iteration_count": iteration_count + 1}
        else:
            print(f"   ❌ The Critic rejected the exam. Feedback: {feedback}")
            # נחזיר את הפידבק כדי שה-Professor יתקן בסבב הבא
            return {"review_feedback": feedback, "iteration_count": iteration_count + 1}

    except Exception as e:
        print(f"Critic Agent failed: {e}")
        return {"review_feedback": "APPROVED", "iteration_count": iteration_count + 1}