from contextvars import ContextVar

_api_key_ctx: ContextVar[str | None] = ContextVar("api_key_ctx", default=None)

def set_api_key(key: str | None):
    return _api_key_ctx.set(key)

def get_api_key() -> str | None:
    return _api_key_ctx.get()

def reset_api_key(token):
    _api_key_ctx.reset(token)