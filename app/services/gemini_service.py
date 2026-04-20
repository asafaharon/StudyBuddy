import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# 1. טעינת משתני הסביבה
load_dotenv()

# 2. שליפת המפתח ובדיקת תקינות (Fail-Fast)
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("CRITICAL ERROR: GEMINI_API_KEY is missing in the .env file")

# 3. אתחול הלקוח החדש
client = genai.Client(api_key=api_key)

# מודל ה-8B הוא מודל חדש, סופר-מהיר ופתוח למשתמשים חינמיים
MODEL_NAME = 'gemini-2.5-flash'
async def generate_structured_json(prompt: str, system_instruction: str) -> dict:
    """
    פונקציה גנרית לשליחת פרומפט ל-Gemini וקבלת JSON מובנה בחזרה.
    """
    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",  # הכרחת פלט JSON
            temperature=0.4  # שומרים על יצירתיות מבוקרת
        )

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )

        return json.loads(response.text)

    except json.JSONDecodeError:
        print("Error: Gemini returned invalid JSON")
        raise
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        raise