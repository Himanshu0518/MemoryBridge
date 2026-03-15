from fastapi import HTTPException, Request
import jwt
from server.config.env import SECRET_KEY, ALGORITHM

def verify_token(request: Request):
    token = None

    # 1. Check cookie first
    token = request.cookies.get("access_token")

    # 2. If not in cookie, check Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    # 3. If still no token → unauthorized
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    # 4. Verify token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")