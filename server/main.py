from fastapi import FastAPI
from server.config.db import Base, engine
from server.core.api_error import ApiError
from server.core.exception_handler import api_error_handler

# Import all models so SQLAlchemy registers them before create_all
from server.models import User, Patient, Person, FaceEmbedding
from server.models import Conversation, Transcript, Summary

# Routers
from server.routers.user import router as user_router
from server.routers.recognition import router as recognition_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MemoryBridge API")

app.add_exception_handler(ApiError, api_error_handler)

app.include_router(user_router)
app.include_router(recognition_router)
