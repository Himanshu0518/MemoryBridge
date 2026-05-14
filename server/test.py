import asyncio
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from config.env import GEMINI_API_KEY
import sys

async def main():
    model = "gemini-2.5-flash"
    if len(sys.argv) > 1:
        model = sys.argv[1]
    llm = ChatGoogleGenerativeAI(model=model, google_api_key=GEMINI_API_KEY)
    try:
        res = await llm.ainvoke("hi")
        print(f"Success with {model}: {res.content}")
    except Exception as e:
        print(f"Error with {model}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
