import re
import time
import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("scraper_service")

SEBI_LIST_URL = "https://www.sebi.gov.in/sebiweb/ajax/home/getnewslistinfo.jsp"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.sebi.gov.in/legal.html",
    "Accept": "text/html, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}
PDF_PATTERN = re.compile(r"sebi_data/attachdocs/[^\"'\s]+\.pdf")
RBI_LIST_URL = "https://www.rbi.org.in/scripts/NotificationUser.aspx"
RBI_PDF_PATTERN = re.compile(r"https://rbidocs\.rbi\.org\.in/rdocs/notification/PDFs/[^\"'\s]+\.PDF", re.IGNORECASE)


def fetch_sebi_circulars(max_pages: int = 5) -> list[dict]:
    """Scrape SEBI's circulars listing (2-hop): walk paginated listing,
    then visit each detail page to extract its real PDF link.
    Returns list of {title, date, detail_url, pdf_url}."""
    records = []

    for page in range(max_pages):
        payload = {
            "next": "n",
            "nextValue": str(page),
            "search": "", "fromDate": "", "toDate": "", "fromYear": "", "toYear": "",
            "deptId": "-1", "sid": "1", "ssid": "7", "smid": "0",
            "ssidhidden": "7", "intmid": "-1",
            "sText": "Legal", "ssText": "Circulars", "smText": "", "doDirect": "1",
        }
        try:
            resp = requests.post(SEBI_LIST_URL, data=payload, headers=HEADERS, timeout=30)
            resp.raise_for_status()
        except Exception as e:
            logger.warning(f"SEBI scrape page {page} failed: {e}")
            break

        html_part = resp.text.split("#@#")[0]  # response has a '#@#'-delimited breadcrumb tail, discard it
        soup = BeautifulSoup(html_part, "html.parser")

        rows = soup.select("table tr[role='row']")
        if not rows:
            logger.info(f"SEBI scrape: page {page} returned 0 rows, stopping")
            break

        for row in rows:
            cells = row.find_all("td")
            if len(cells) != 2:
                continue
            date_cell, title_cell = cells
            link = title_cell.find("a")
            if not link or not link.get("href"):
                continue
            records.append({
                "title": link.get("title", link.text.strip()),
                "date": date_cell.text.strip(),
                "detail_url": link["href"],
                "pdf_url": None,
            })

        time.sleep(1)  # polite delay, avoid hammering a government server

    for record in records:
        record["pdf_url"] = _resolve_pdf_url(record["detail_url"])
        time.sleep(0.5)

    return records


def _resolve_pdf_url(detail_url: str) -> str | None:
    """Second hop: visit a circular's detail page, extract its real PDF link."""
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        match = PDF_PATTERN.search(resp.text)
        return f"https://www.sebi.gov.in/{match.group()}" if match else None
    except Exception as e:
        logger.warning(f"Failed to resolve PDF for {detail_url}: {e}")
        return None

def fetch_rbi_notifications() -> list[dict]:
    """Scrape RBI's notifications listing (1-hop, no detail page needed —
    PDF link sits right in the listing HTML). Only static/server-rendered
    HTML confirmed — no AJAX/JS needed for this page.
    Returns list of {title, date, detail_url, pdf_url}."""
    try:
        resp = requests.get(RBI_LIST_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"RBI scrape failed: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")

    records = []
    current_date = None

    for row in soup.select("table tr"):
        bold = row.find("strong") or row.find("b")
        if bold and re.match(r"[A-Z][a-z]{2} \d{2}, \d{4}", bold.text.strip()):
            current_date = bold.text.strip()
            continue

        title_link = row.find("a", href=re.compile(r"NotificationUser\.aspx\?Id="))
        pdf_match = RBI_PDF_PATTERN.search(str(row))
        if not title_link or not pdf_match:
            continue

        records.append({
            "title": title_link.text.strip(),
            "date": current_date,
            "detail_url": title_link["href"],
            "pdf_url": pdf_match.group(),
        })

    logger.info(f"RBI scrape: found {len(records)} notifications")
    return records