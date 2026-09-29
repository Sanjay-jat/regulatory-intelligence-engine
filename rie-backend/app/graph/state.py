from typing import TypedDict, Optional, List
from app.models.schemas import CitationSource, AmendmentDiff

class AgentState(TypedDict):
    query:str
    filter_body:Optional[str] # "SEBI" | "RBI" | None
    thread_id: str                       # NEW: groups messages into one conversation
    conversation_history: List[dict]
    # working state, filled in as nodes run
    translated_intent: Optional[str]     # Hinglish/casual query -> clean English intent
    query_type: Optional[str]
    date_from: Optional[str]             # "YYYY-MM-DD" or None
    date_to: Optional[str]                  # "YYYY-MM-DD" or None
    retrieved_chunks: List[dict]         # raw search results: {text, metadata, score}
    has_conflict: bool                   # did search find both old + superseded version?
    resolved_context: Optional[str]      # final context text, conflict-resolved, fed to synthesis

    # --- output ---
    answer: Optional[str]
    citations: List[CitationSource]
    amendment_diff: Optional[AmendmentDiff]

    # --- guardrails / transparency ---
    execution_step_logs: List[str]
    loop_count: int                      # incremented each retry, checked against max_loops=4
    error: Optional[str] 
    
