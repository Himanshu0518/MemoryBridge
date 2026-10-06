"""
socket_server.py
================
Socket.IO server instance — defined once here and imported everywhere.

Keeping it in its own module avoids circular imports between main.py,
the transcription router, and the transcription service.
"""

import socketio

# AsyncServer is needed because FastAPI is async.
# cors_allowed_origins should match your frontend dev server.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)
