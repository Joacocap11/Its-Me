import os


def _secret_key() -> str:
    key = os.environ.get("SECRET_KEY", "")
    if len(key) < 32:
        raise RuntimeError("SECRET_KEY es obligatoria y debe tener al menos 32 caracteres")
    return key


SECRET_KEY = _secret_key()
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "30"))
DATABASE_URL = os.environ["DATABASE_URL"]
