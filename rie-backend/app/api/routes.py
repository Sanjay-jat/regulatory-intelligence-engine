from fastapi import APIRouter, Request, UploadFile, File, Form, Header, Depends, HTTPException
from typing import Optional
from app.models.schemas import QueryRequest, QueryResponse
from app.graph.graph import workflow
from app.services.ingestion_service import ingest_pdf
from app.services import thread_service
from app.middleware.rate_limit import limiter, RATE_LIMIT
from app.middleware.auth import verify_api_key
from app.core.request_context import set_api_key, reset_api_key
from app.core.config import settings
import logging

router = APIRouter(prefix="/api/v1")
logger = logging.getLogger("routes")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/query", response_model=QueryResponse)
@limiter.limit(RATE_LIMIT)
async def query(
    request: Request,
    body: QueryRequest,
    x_user_gemini_key: Optional[str] = Header(default=None),
    _: None = Depends(verify_api_key),
):
    if settings.LLM_PROVIDER == "gemini" and not settings.GEMINI_API_KEY and not x_user_gemini_key:
        return QueryResponse(
            thread_id=body.thread_id or "",
            answer="This app runs on your own Gemini API key. Add it from the key icon before asking a question.",
            citations=[],
            amendment_diff=None,
            execution_step_logs=["No Gemini API key available (no server key configured, no BYOK key provided) — request skipped."],
        )
    thread_id = body.thread_id
    if not thread_id or not thread_service.thread_exists(thread_id):
        thread_id = thread_service.create_thread()

    history = thread_service.get_recent_history(thread_id, limit=3)

    state = {
        "query": body.query,
        "filter_body": body.filter_body,
        "thread_id": thread_id,
        "conversation_history": history,
        "translated_intent": None,
        "query_type": None,
        "date_from": body.date_from,
        "date_to": body.date_to,
        "retrieved_chunks": [],
        "has_conflict": False,
        "resolved_context": None,
        "answer": None,
        "citations": [],
        "amendment_diff": None,
        "execution_step_logs": [],
        "loop_count": 0,
    }

    token = set_api_key(x_user_gemini_key)
    try:
        result = workflow.invoke(state, config={"configurable": {"thread_id": thread_id}})
    except Exception as e:
        logger.error(f"workflow failed for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail="Query processing failed")
    finally:
        reset_api_key(token)

    try:
        thread_service.save_message(thread_id, body.query, result)
    except Exception as e:
        logger.warning(f"Failed to save message to thread {thread_id}: {e}")

    return QueryResponse(
        thread_id=thread_id,
        answer=result["answer"],
        citations=result["citations"],
        amendment_diff=result["amendment_diff"],
        execution_step_logs=result["execution_step_logs"],
    )


@router.get("/threads")
@limiter.limit(RATE_LIMIT)
async def list_threads(request: Request, _: None = Depends(verify_api_key)):
    return thread_service.list_threads()


@router.get("/threads/{thread_id}")
@limiter.limit(RATE_LIMIT)
async def get_thread(request: Request, thread_id: str, _: None = Depends(verify_api_key)):
    return thread_service.get_thread_messages(thread_id)


@router.delete("/threads/{thread_id}")
@limiter.limit(RATE_LIMIT)
async def delete_thread_route(request: Request, thread_id: str, _: None = Depends(verify_api_key)):
    try:
        thread_service.delete_thread(thread_id)
    except Exception as e:
        logger.error(f"delete failed for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail="Delete failed")
    return {"status": "deleted"}


@router.post("/ingest")
@limiter.limit(RATE_LIMIT)
async def ingest(
    request: Request,
    file: UploadFile = File(...),
    source_url: Optional[str] = Form(default=None),
    x_user_gemini_key: Optional[str] = Header(default=None),
    _: None = Depends(verify_api_key),
):
    return await ingest_pdf(file, api_key_override=x_user_gemini_key, source_url=source_url)