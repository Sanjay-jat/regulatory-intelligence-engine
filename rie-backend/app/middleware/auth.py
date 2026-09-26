import secrets
from fastapi import Header, HTTPException
from app.core.config import settings

async def verify_api_key(x_api_key: str = Header(...)):
    if not settings.API_KEY:
        return
    if not secrets.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")