import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

try:
    res = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Output a JSON object with key 'message' and value 'hello world'.",
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    print("MIME TYPE JSON RESULT:", res.text)
except Exception as e:
    print("Config error:", type(e).__name__, str(e))
