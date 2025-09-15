FROM python:3.11-slim


WORKDIR /app


RUN apt-get update && apt-get install -y \
gcc \
postgresql-client \
&& rm -rf /var/lib/apt/lists/*


COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY . .


# Non-root
RUN useradd --create-home --shell /bin/bash app \
&& chown -R app:app /app
USER app


EXPOSE 8000


# Healthcheck using stdlib (no requests needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
CMD python - <<'PY' || exit 1
import urllib.request, sys
try:
with urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5) as r:
sys.exit(0 if r.status == 200 else 1)
except Exception:
sys.exit(1)
PY


CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
