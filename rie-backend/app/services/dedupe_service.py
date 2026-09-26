import psycopg
from app.core.db import pool


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ingested_sources (
    source_url TEXT PRIMARY KEY,
    circular_id TEXT,
    regulatory_body TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def init_dedupe_table() -> None:
    """Call once at app startup — safe to call repeatedly, no-op if table exists."""
    with pool.connection() as conn:
        conn.execute(CREATE_TABLE_SQL)


def is_already_ingested(source_url: str) -> bool:
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM ingested_sources WHERE source_url = %s", (source_url,)
        ).fetchone()
        return row is not None


def mark_ingested(source_url: str, circular_id: str | None, regulatory_body: str) -> None:
    with pool.connection() as conn:
        conn.execute(
            """INSERT INTO ingested_sources (source_url, circular_id, regulatory_body)
               VALUES (%s, %s, %s) ON CONFLICT (source_url) DO NOTHING""",
            (source_url, circular_id, regulatory_body),
        )