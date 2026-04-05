from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

from server.config.env import DATABASE_URL

"""
db.py — SQLAlchemy engine setup for Neon PostgreSQL (serverless)

Why these settings?
───────────────────
Neon is a serverless Postgres provider. Its connections can go cold (drop)
at any time when idle. Without proper pool settings SQLAlchemy will hand your
request a dead connection → "SSL connection has been closed unexpectedly".

Fixes applied:
  1. pool_pre_ping=True      — before lending a connection from the pool,
                               SQLAlchemy sends a cheap "SELECT 1" to verify
                               it is still alive.  If dead, it reconnects.

  2. pool_recycle=300        — forcibly recycle connections after 5 minutes
                               so they never stay open long enough to go cold.

  3. pool_size / max_overflow — sensible limits for a small app.

  4. sslmode=require          — already present in the DATABASE_URL query string,
                               so Neon SSL is always negotiated.  We strip
                               channel_binding (psycopg handles it automatically).

Driver: psycopg (v3) — the modern async-capable PostgreSQL adapter for Python.
       SQLAlchemy dialect: postgresql+psycopg
"""

# Strip channel_binding from the URL — psycopg3 handles it automatically.
_db_url = DATABASE_URL.replace("&channel_binding=require", "").replace(
    "?channel_binding=require&", "?"
).replace(
    "?channel_binding=require", ""
)

# Switch dialect from the default psycopg2 to psycopg (v3)
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    _db_url,

    # ── Connection health ────────────────────────────────────────────────────
    # Ping every connection before use — catches dropped SSL connections
    pool_pre_ping=True,

    # Recycle connections after 5 minutes (Neon idles out quickly)
    pool_recycle=300,

    # ── Pool size ────────────────────────────────────────────────────────────
    pool_size=5,        # keep up to 5 connections open
    max_overflow=10,    # allow up to 10 extra under load

    # ── Connection params ────────────────────────────────────────────────────
    # psycopg v3 accepts libpq-style connect params via connect_timeout kwarg
    # and TCP keepalive settings via the connection string options.
    connect_args={
        "connect_timeout": 10,      # fail fast instead of hanging
        "keepalives": 1,            # TCP keepalive — detects dead connections
        "keepalives_idle": 30,      # send keepalive after 30s of idle
        "keepalives_interval": 10,  # retry every 10s
        "keepalives_count": 5,      # give up after 5 failed retries
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency — yields a DB session and guarantees it is closed
    after the request finishes (even if an exception is raised).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
