FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN useradd --system --no-create-home --uid 10001 itsme
COPY alembic.ini entrypoint.sh ./
COPY alembic ./alembic
COPY app ./app

FROM base AS test
COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt
COPY pytest.ini ./
COPY tests ./tests
USER itsme
CMD ["pytest", "-q"]

FROM base AS runtime
USER itsme
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]
CMD ["./entrypoint.sh"]
