import logging
import requests
from app.services.scraper_service import fetch_rbi_notifications, HEADERS
from app.services.dedupe_service import is_already_ingested, mark_ingested, init_dedupe_table
from app.services.ingestion_service import ingest_pdf_bytes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest_rbi")


def run() -> None:
    init_dedupe_table()

    rbi_records = fetch_rbi_notifications()
    fresh_records = [r for r in rbi_records if not is_already_ingested(r["pdf_url"])]

    logger.info(f"Found {len(rbi_records)} RBI notifications, {len(fresh_records)} new")

    new_count, fail_count = 0, 0
    quota_hit = False
    ingested_metadata = []

    for i, record in enumerate(fresh_records, 1):
        pdf_url = record["pdf_url"]

        try:
            pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=30)
            pdf_resp.raise_for_status()
        except Exception as e:
            logger.warning(f"[{i}/{len(fresh_records)}] Failed to download {pdf_url}: {e}")
            fail_count += 1
            continue

        filename = pdf_url.split("/")[-1]
        result = ingest_pdf_bytes(filename, pdf_resp.content, source_url=pdf_url)

        if result["status"] == "success":
            mark_ingested(pdf_url, result.get("circular_id"), "RBI")
            new_count += 1
            ingested_metadata.append({
                "circular_id": result.get("circular_id"),
                "title": record["title"],
                "date": record["date"],
            })
            logger.info(f"[{i}/{len(fresh_records)}] Ingested: {record['title'][:60]}")
        else:
            error_msg = str(result.get("message", ""))
            if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                logger.warning(f"[{i}/{len(fresh_records)}] Gemini daily quota hit — stopping here.")
                quota_hit = True
                break
            logger.warning(f"[{i}/{len(fresh_records)}] Ingest failed for {record['title'][:60]}: {result.get('message')}")
            fail_count += 1

    status = "STOPPED (quota exhausted)" if quota_hit else "Done"
    logger.info(f"{status}. New: {new_count}, failed: {fail_count}")

    logger.info("--- Ingested RBI metadata (for README/testing) ---")
    for m in ingested_metadata:
        logger.info(f"- {m['title']} ({m['circular_id']}, {m['date']})")


if __name__ == "__main__":
    run()