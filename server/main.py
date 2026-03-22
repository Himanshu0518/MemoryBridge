from fastapi import FastAPI
from server.config.db import Base, engine
from server.core.api_error import ApiError
from server.core.exception_handler import api_error_handler

# Register all models with SQLAlchemy before create_all
from server.models import User, Patient, Person, FaceEmbedding
from server.models import Conversation, Transcript, Summary

# Routers
from server.routers.user import router as user_router
from server.routers.patient import router as patient_router
from server.routers.recognition import router as recognition_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MemoryBridge API",
    description="AI-assisted memory support system for Alzheimer's patients.",
    version="1.0.0",
)

app.add_exception_handler(ApiError, api_error_handler)

app.include_router(user_router)
app.include_router(patient_router)
app.include_router(recognition_router)
