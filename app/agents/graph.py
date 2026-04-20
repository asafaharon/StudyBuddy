from langgraph.graph import StateGraph, END
from app.agents.states import GraphState
from app.agents.nodes import curriculum_planner_node, generator_node, reviewer_node


# 1. פונקציית ניתוב (Conditional Edge Router)
def route_after_review(state: GraphState):
    """
    בודק את ה-State ומחליט לאן ללכת עכשיו: לסוף, או בחזרה לפרופסור?
    """
    feedback = state.get("review_feedback", "")

    if feedback == "APPROVED":
        return "end"
    else:
        return "revise"


# 2. אתחול הגרף עם ה-State שלנו
workflow = StateGraph(GraphState)

# 3. הוספת ה"צמתים" (הסוכנים שלנו)
workflow.add_node("planner", curriculum_planner_node)
workflow.add_node("generator", generator_node)
workflow.add_node("reviewer", reviewer_node)

# 4. הגדרת הזרימה (Edges) - איך עוברים מאחד לשני
workflow.set_entry_point("planner")  # מתחילים תמיד מהארכיטקט
workflow.add_edge("planner", "generator")  # מהארכיטקט לפרופסור
workflow.add_edge("generator", "reviewer")  # מהפרופסור למבקר

# 5. הקסם: ניתוב מותנה (Conditional Edges)
# כאן אנחנו אומרים: "אחרי ה-Reviewer, תפעיל את הפונקציה route_after_review.
# אם היא מחזירה 'end', לך לסיום. אם היא מחזירה 'revise', תחזור ל-Generator".
workflow.add_conditional_edges(
    "reviewer",
    route_after_review,
    {
        "end": END,
        "revise": "generator"
    }
)

# 6. קימפול הגרף למנוע ריצה
exam_generation_app = workflow.compile()