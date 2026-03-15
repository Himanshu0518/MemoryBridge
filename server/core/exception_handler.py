from fastapi import Request
from fastapi.responses import JSONResponse
from server.core.api_error import ApiError

async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "data": None
        }
    )