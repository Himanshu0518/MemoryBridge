import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL                  = os.getenv("DATABASE_URL")
SECRET_KEY                    = os.getenv("SECRET_KEY")
ALGORITHM                     = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES",  "43200"))
REFRESH_TOKEN_EXPIRE_MINUTES  = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "129600"))
PATIENT_SESSION_EXPIRE_MINUTES = int(os.getenv("PATIENT_SESSION_EXPIRE_MINUTES", "480"))

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in .env")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is missing in .env")
