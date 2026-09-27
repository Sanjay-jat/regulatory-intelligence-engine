import os
import json
import logging
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from app.core.config import settings
from app.services.llm_service import get_embedder
from app.models.schemas import StructuredRegulatoryCircular

logger = logging.getLogger("faiss_service")
META_FILE = "index_meta.json"


class FaissService:
    def __init__(self):
        self.index_path = settings.FAISS_INDEX_PATH
        self._check_provider_match()
        self.embedder = self._boot_embedder()
        self.store: FAISS | None = self._load_if_exists()

    def _boot_embedder(self):
        """Embedder used at boot to satisfy FAISS.load_local's interface.
        load_local never calls the API — it only deserializes the index —
        so this is safe even with no server-side key. Real per-request
        embedding always goes through search()/add_circular()'s
        api_key_override, which resolves a fresh, real embedder."""
        try:
            return get_embedder()
        except ValueError:
            logger.warning("No server-side embedder key — booting in BYOK-only mode.")
            return GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key="placeholder",
            )

    def _meta_path(self) -> str:
        return os.path.join(self.index_path, META_FILE)

    def _check_provider_match(self) -> None:
        meta_path = self._meta_path()
        if not os.path.exists(meta_path):
            return
        with open(meta_path) as f:
            meta = json.load(f)
        if meta.get("provider") != settings.LLM_PROVIDER:
            raise RuntimeError(
                f"FAISS index was built with LLM_PROVIDER='{meta.get('provider')}', "
                f"but current config is '{settings.LLM_PROVIDER}'. "
                f"Embedding dimensions won't match. Clear data/faiss_index/ and re-ingest, "
                f"or switch LLM_PROVIDER back."
            )

    def _save_meta(self) -> None:
        os.makedirs(self.index_path, exist_ok=True)
        with open(self._meta_path(), "w") as f:
            json.dump({"provider": settings.LLM_PROVIDER}, f)

    def _load_if_exists(self) -> FAISS | None:
        if os.path.exists(os.path.join(self.index_path, "index.faiss")):
            return FAISS.load_local(
                self.index_path, self.embedder, allow_dangerous_deserialization=True
            )
        return None

    def add_circular(self, circular: StructuredRegulatoryCircular, source_url: str | None = None,
                      api_key_override: str | None = None) -> dict:
        replaced = self._remove_existing(circular.circular_id)

        docs = [
            Document(
                page_content=section.raw_content,
                metadata={
                    "circular_id": circular.circular_id,
                    "title": circular.title,
                    "regulatory_body": circular.regulatory_body,
                    "issuance_date": str(circular.issuance_date),
                    "heading": section.heading,
                    "is_superseded": False,
                    "source_url": source_url,
                },
            )
            for section in circular.sections
        ]

        embedder = get_embedder(api_key_override=api_key_override) if api_key_override else self.embedder

        if self.store is None:
            self.store = FAISS.from_documents(docs, embedder)
        else:
            self.store.add_documents(docs, embedding=embedder)

        supersession_matched = False
        if circular.supersedes:
            supersession_matched = self._mark_superseded(circular.supersedes)

        self._save_meta()
        self.store.save_local(self.index_path)

        return {
            "chunks_added": len(docs),
            "replaced_existing": replaced,
            "supersedes_requested": circular.supersedes,
            "supersession_matched": supersession_matched,
        }

    def _remove_existing(self, circular_id: str) -> bool:
        if self.store is None:
            return False
        ids_to_remove = [
            doc_id
            for doc_id, doc in self.store.docstore._dict.items()
            if doc.metadata.get("circular_id") == circular_id
        ]
        if ids_to_remove:
            self.store.delete(ids=ids_to_remove)
            logger.info(f"Replaced {len(ids_to_remove)} existing chunks for {circular_id}")
            return True
        return False

    def _mark_superseded(self, old_circular_id: str) -> bool:
        if self.store is None:
            return False

        normalized_target = self._normalize(old_circular_id)
        matched = False

        for doc in self.store.docstore._dict.values():
            doc_id = doc.metadata.get("circular_id", "")
            if doc_id == old_circular_id or self._normalize(doc_id) == normalized_target:
                doc.metadata["is_superseded"] = True
                matched = True

        if not matched:
            logger.warning(
                f"supersedes='{old_circular_id}' declared but no matching circular "
                f"found in index — supersession NOT applied, check for typos/OCR drift."
            )
        return matched

    @staticmethod
    def _normalize(s: str) -> str:
        return "".join(s.split()).lower().replace("i", "1").replace("l", "1")

    def search(self, query: str, filter_body: str | None = None, k: int = 4,
               date_from: str | None = None, date_to: str | None = None,
               api_key_override: str | None = None):
        if self.store is None:
            return []

        embedder = get_embedder(api_key_override=api_key_override) if api_key_override else self.embedder
        query_vector = embedder.embed_query(query)

        filter_dict = {"regulatory_body": filter_body} if filter_body else None

        if not date_from and not date_to:
            return self.store.similarity_search_with_score_by_vector(query_vector, k=k, filter=filter_dict)

        over_fetch_k = k * 5
        results = self.store.similarity_search_with_score_by_vector(query_vector, k=over_fetch_k, filter=filter_dict)

        filtered = [
            (doc, score) for doc, score in results
            if _in_date_range(doc.metadata.get("issuance_date"), date_from, date_to)
        ]
        return filtered[:k]


def _in_date_range(issuance_date: str | None, date_from: str | None, date_to: str | None) -> bool:
    if not issuance_date:
        return False
    if date_from and issuance_date < date_from:
        return False
    if date_to and issuance_date > date_to:
        return False
    return True


faiss_service = FaissService()