import os
from dotenv import load_dotenv
from google import genai

# טעינת המפתח מה-.env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ שגיאה: לא נמצא מפתח API בקובץ .env")
    exit()

print(f"🔍 בודק הרשאות עבור המפתח שמתחיל ב: {api_key[:10]}...\n")

try:
    client = genai.Client(api_key=api_key)
    print("✅ התחברות לשרתי גוגל הצליחה! הנה המודלים שפתוחים עבורך להפקת טקסט:")
    print("-" * 40)

    # שליפת כל המודלים הזמינים למפתח הזה
    for m in client.models.list():
        # אנחנו מסננים רק מודלים שתומכים ביצירת תוכן (ולא מודלים של תמונות/קול בלבד)
        if "generateContent" in m.supported_actions:
            print(m.name)

    print("-" * 40)
except Exception as e:
    print(f"❌ התקשורת נכשלה: {e}")