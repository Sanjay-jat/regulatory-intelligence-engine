from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings


def get_llm(task: str = "default", api_key_override: str | None = None):
    """
    task="pro"  -> heavier model, deep legal synthesis (Gemini prod only)
    task="fast" or "default" -> lighter model, routing/extraction
    api_key_override -> BYOK: visitor's own Gemini key. If present, ALWAYS uses
    Gemini with that key, regardless of LLM_PROVIDER — lets BYOK be tested
    locally without switching .env, and matches real deployed behavior.
    """
    if api_key_override:
        model_name = (settings.GEMINI_MODEL_PRO if task == "pro" else settings.GEMINI_MODEL_FAST)
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key_override,
            temperature=0,
            timeout=settings.LLM_TIMEOUT_SECONDS,
            max_retries=1,
        )

    if settings.LLM_PROVIDER == "ollama":
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    if settings.LLM_PROVIDER == "gemini":
        key = settings.GEMINI_API_KEY
        if not key:
            raise ValueError(
                "No Gemini API key available — add your own key, or the server "
                "has none configured."
            )
        model_name = (settings.GEMINI_MODEL_PRO if task == "pro" else settings.GEMINI_MODEL_FAST)
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key,
            temperature=0,
            timeout=settings.LLM_TIMEOUT_SECONDS,
            max_retries=1,
        )
    raise ValueError(f"Unknown LLM_PROVIDER:{settings.LLM_PROVIDER}")


def get_embedder(api_key_override: str | None = None):
    """
    Returns one embeddings client — used by faiss_service to turn
    circular text (ingestion) and user queries (search) into vectors.
    Both providers expose .embed_query() and .embed_documents().
    api_key_override behaves same as get_llm — BYOK key always forces Gemini.
    """
    if api_key_override:
        return GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key_override,
        )

    if settings.LLM_PROVIDER == "ollama":
        return OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )
    if settings.LLM_PROVIDER == "gemini":
        key = settings.GEMINI_API_KEY
        if not key:
            raise ValueError("No Gemini API key available for embeddings.")
        return GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=key,
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")