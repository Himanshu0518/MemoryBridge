import logging
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from server.config.env import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Output schema
class IdentityExtraction(BaseModel):
    name: str = Field(description="The name of the visiting person, if mentioned. E.g., 'Rahul'", default="")
    relation: str = Field(description="The relation to the patient, if mentioned. E.g., 'son', 'doctor'", default="")

# Shared LLM
_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.0,  # Zero temperature for extraction
    google_api_key=GEMINI_API_KEY,
)

# Create a structured LLM
_structured_llm = _llm.with_structured_output(IdentityExtraction)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an AI assistant helping to onboard guests for an Alzheimer's system. Extract the guest's name and relation to the patient from their spoken introduction. If a field is not explicitly mentioned, leave it blank."),
    ("human", "{transcript}")
])

_pipeline = _PROMPT | _structured_llm

async def extract_identity_from_transcript(transcript: str) -> dict:
    """
    Extracts name and relation from a spoken transcript.
    Returns a dict with 'name' and 'relation' keys (values can be empty strings).
    """
    try:
        logger.info("Extracting identity from transcript: '%s'", transcript)
        result: IdentityExtraction = await _pipeline.ainvoke({"transcript": transcript})
        return {
            "name": result.name,
            "relation": result.relation
        }
    except Exception as exc:
        logger.error("Failed to extract identity: %s", exc)
        return {"name": "", "relation": ""}
