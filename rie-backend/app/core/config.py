from pydantic_settings import BaseSettings,SettingsConfigDict
from typing import Literal
from pydantic import model_validator


class setting(BaseSettings):
    model_config=SettingsConfigDict(env_file=".env",extra="ignore")
    @model_validator(mode="after")
    def check_gemini_key(self):
        if self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            import logging
            logging.warning("No server-side GEMINI_API_KEY set — running in BYOK-only mode.")
        return self
    ## swtich LLM provider
    LLM_PROVIDER: Literal["gemini","ollama"] = "ollama"

    ## Ollama local model path(local dev)
    OLLAMA_BASE_URL:str = "http://localhost:11434"
    OLLAMA_MODEL:str="llama3.2"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    ##gemini (production) 
    GEMINI_API_KEY:str=""
    GEMINI_MODEL_FAST:str="gemini-2.5-flash"
    GEMINI_MODEL_PRO: str = "gemini-2.5-pro"

    ##vector Store (FAISS)
    FAISS_INDEX_PATH:str="./data/faiss_index"

    ## Postgres (agent checkpointer)
    DATABASE_URL:str=""

    ## Security
    JWT_SECRET:str=""

    # --- Rate limiting ---
    RATE_LIMIT_PER_MINUTE: int = 60
    LLM_TIMEOUT_SECONDS: int = 30

    API_KEY: str = ""                     # NEW: required header value for /query, /ingest
    CACHE_TTL_SECONDS: int = 300           # NEW: query cache lifetime
    CACHE_MAX_SIZE: int = 100              # NEW: max cached queries
    MAX_UPLOAD_MB: int = 20                # NEW: PDF size cap

    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "regulatory-intelligence-engine"

settings=setting()