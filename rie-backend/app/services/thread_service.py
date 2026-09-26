import uuid
import json

from app.core.db import pool


def init_tables() -> None:
    try:
        with pool.connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS threads (
                    thread_id TEXT PRIMARY KEY,
                    created_at TIMESTAMPTZ DEFAULT now(),
                    updated_at TIMESTAMPTZ DEFAULT now()
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    thread_id TEXT REFERENCES threads(thread_id),
                    query TEXT NOT NULL,
                    answer TEXT,
                    citations JSONB,
                    amendment_diff JSONB,
                    execution_step_logs JSONB,
                    created_at TIMESTAMPTZ DEFAULT now()
                )
            """)
    except Exception as e:
        raise RuntimeError(f"init_tables failed: {e}")


def create_thread() -> str:
    thread_id = str(uuid.uuid4())
    try:
        with pool.connection() as conn:
            conn.execute("INSERT INTO threads (thread_id) VALUES (%s)", (thread_id,))
    except Exception as e:
        raise RuntimeError(f"create_thread failed: {e}")
    return thread_id


def thread_exists(thread_id: str) -> bool:
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "SELECT 1 FROM threads WHERE thread_id = %s", (thread_id,)
            ).fetchone()
            return row is not None
    except Exception as e:
        raise RuntimeError(f"thread_exists failed: {e}")


def get_recent_history(thread_id: str, limit: int = 3) -> list[dict]:
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                """SELECT query, answer FROM messages
                   WHERE thread_id = %s ORDER BY created_at DESC LIMIT %s""",
                (thread_id, limit),
            ).fetchall()
        return [{"query": r[0], "answer": r[1]} for r in reversed(rows)]
    except Exception as e:
        raise RuntimeError(f"get_recent_history failed: {e}")


def save_message(thread_id: str, query: str, result: dict) -> None:
    try:
        with pool.connection() as conn:
            conn.execute(
                """INSERT INTO messages
                   (thread_id, query, answer, citations, amendment_diff, execution_step_logs)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    thread_id,
                    query,
                    result["answer"],
                    json.dumps([c.model_dump() for c in result["citations"]]),
                    json.dumps(result["amendment_diff"].model_dump()) if result["amendment_diff"] else None,
                    json.dumps(result["execution_step_logs"]),
                ),
            )
            conn.execute(
                "UPDATE threads SET updated_at = now() WHERE thread_id = %s", (thread_id,)
            )
    except Exception as e:
        raise RuntimeError(f"save_message failed: {e}")


def list_threads(limit: int = 50) -> list[dict]:
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                """SELECT t.thread_id, t.updated_at,
                          (SELECT query FROM messages m WHERE m.thread_id = t.thread_id ORDER BY created_at ASC LIMIT 1) as first_query,
                          (SELECT answer FROM messages m WHERE m.thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_answer
                   FROM threads t ORDER BY t.updated_at DESC LIMIT %s""",
                (limit,),
            ).fetchall()
        return [
            {"thread_id": r[0], "updated_at": r[1].isoformat(), "first_query": r[2], "last_answer": r[3]}
            for r in rows
        ]
    except Exception as e:
        raise RuntimeError(f"list_threads failed: {e}")


def get_thread_messages(thread_id: str) -> list[dict]:
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                """SELECT query, answer, citations, amendment_diff, execution_step_logs, created_at
                   FROM messages WHERE thread_id = %s ORDER BY created_at ASC""",
                (thread_id,),
            ).fetchall()
        return [
            {
                "query": r[0], "answer": r[1], "citations": r[2],
                "amendment_diff": r[3], "execution_step_logs": r[4],
                "created_at": r[5].isoformat(),
            }
            for r in rows
        ]
    except Exception as e:
        raise RuntimeError(f"get_thread_messages failed: {e}")


def delete_thread(thread_id: str) -> None:
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM messages WHERE thread_id = %s", (thread_id,))
            conn.execute("DELETE FROM threads WHERE thread_id = %s", (thread_id,))
    except Exception as e:
        raise RuntimeError(f"delete_thread failed: {e}")