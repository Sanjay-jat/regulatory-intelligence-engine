import sys
import logging
import requests
from app.services.scraper_service import fetch_sebi_circulars, fetch_rbi_notifications, HEADERS
from app.services.dedupe_service import is_already_ingested, mark_ingested, init_dedupe_table
from app.services.ingestion_service import ingest_pdf_bytes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auto_ingest")


def run() -> None:
    init_dedupe_table()

    sebi_records = fetch_sebi_circulars(max_pages=3)
    rbi_records = fetch_rbi_notifications()

    all_records = [{**r, "regulatory_body": "SEBI"} for r in sebi_records if r["pdf_url"]]
    all_records += [{**r, "regulatory_body": "RBI"} for r in rbi_records]
    all_records = all_records[:50]

    logger.info(f"Found {len(all_records)} total records ({len(sebi_records)} SEBI, {len(rbi_records)} RBI) — capped to {len(all_records)}")

    new_count, skip_count, fail_count = 0, 0, 0
    quota_hit = False

    for i, record in enumerate(all_records, 1):
        pdf_url = record["pdf_url"]

        if is_already_ingested(pdf_url):
            skip_count += 1
            logger.info(f"[{i}/{len(all_records)}] Skipped (already done): {record['title'][:50]}")
            continue

        try:
            pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=30)
            pdf_resp.raise_for_status()
        except Exception as e:
            logger.warning(f"[{i}/{len(all_records)}] Failed to download {pdf_url}: {e}")
            fail_count += 1
            continue

        filename = pdf_url.split("/")[-1]
        result = ingest_pdf_bytes(filename, pdf_resp.content, source_url=pdf_url)

        if result["status"] == "success":
            mark_ingested(pdf_url, result.get("circular_id"), record["regulatory_body"])
            new_count += 1
            logger.info(f"[{i}/{len(all_records)}] Ingested: {record['title'][:60]}")
        else:
            error_msg = str(result.get("message", ""))
            if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                logger.warning(f"[{i}/{len(all_records)}] Gemini daily quota hit — stopping here.")
                quota_hit = True
                break
            logger.warning(f"[{i}/{len(all_records)}] Ingest failed for {record['title'][:60]}: {result.get('message')}")
            fail_count += 1

    status = "STOPPED (quota exhausted)" if quota_hit else "Done"
    logger.info(f"{status}. New: {new_count}, skipped: {skip_count}, failed: {fail_count}, remaining: {len(all_records) - new_count - skip_count - fail_count}")
    if quota_hit:
        logger.info("Re-run the same command tomorrow (or with a fresh key) — dedupe table will skip everything already ingested and continue from here.")


if __name__ == "__main__":
    run()