from fastapi import FastAPI
from server.config.db import Base, engine
from server.core.api_error import ApiError
from server.core.exception_handler import api_error_handler
from server.routers.user import router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_exception_handler(ApiError, api_error_handler)
app.include_router(router)