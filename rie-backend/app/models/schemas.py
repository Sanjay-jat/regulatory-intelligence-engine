from pydantic import BaseModel,Field
from typing import List,Optional,Literal
from datetime import date


            ## LLM extracts the pdf into this shape

class CircularSection(BaseModel):
    heading:str=Field(description="Clause title, e.g. 'Section 3: KYC Verification Procedures'")
    raw_content:str = Field(description="Full unaltered text of this section")
    key_takeaways: List[str] = Field(description="Compliance action items in this section")


class StructuredRegulatoryCircular(BaseModel):
    circular_id: str = Field(description="Official reference number")
    title: str = Field(description="Full subject title")
    issuance_date: date = Field(description="Publication date, YYYY-MM-DD")
    regulatory_body: Literal["SEBI", "RBI"]
    sections: List[CircularSection]
    supersedes: Optional[str] = Field(default=None, description="circular_id this document replaces, if any")


class QueryRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000, description="User question, English or Hinglish")
    filter_body: Optional[Literal["SEBI","RBI"]]=Field(default=None,description="Filter by regulator")
    thread_id: Optional[str] = None
    date_from: Optional[date] = Field(default=None)
    date_to: Optional[date] = Field(default=None)

class CitationSource(BaseModel):
    circular_id: str
    title: str
    regulatory_body: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    source_url: Optional[str] = None
    is_superseded: bool = False
    context_verified: bool = False


class AmendmentDiff(BaseModel):
    old_circular_id: str
    old_text: str
    new_circular_id: str
    new_text: str


class QueryResponse(BaseModel):
    thread_id:str
    answer: str
    citations: List[CitationSource]
    amendment_diff: Optional[AmendmentDiff] = None
    execution_step_logs: List[str]  