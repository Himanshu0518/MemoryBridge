from fastapi import FastAPI
from server.config.db import Base, engine
from server.routers import user as user_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(user_router.router)