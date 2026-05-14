import asyncio
from server.services.transcription_service import rest_finish_conversation

async def test():
    try:
        res = await rest_finish_conversation(1, 'Test', 'Patient is taking aspirin and has a headache.')
        print("RESULT:")
        print(res)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
