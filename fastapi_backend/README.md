# FastAPI Video Backend

Minimal FastAPI server to handle video uploads for the Serenity Next.js frontend.

## Features

- `POST /videos/upload` – Upload a video file (field name `file`).
- `GET /videos/` – List metadata for uploaded videos.
- Static file serving at `/uploads/<filename>`.
- Basic Bearer token check when `Authorization` header is provided.

Uploaded files are stored on the local filesystem in the `uploads/` directory
which is created on startup. The directory is ephemeral on services like
Render; consider using object storage (S3/GCS) for production deployments.

## Local Development

```bash
cd fastapi_backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## Deployment (Render)

Create a new **Web Service** and configure the following commands:

- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

After deployment, set your Next.js environment variable:

```
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

- `PORT` – Port to bind (default `8000`).
- `ORIGIN` – Allowed CORS origin (default `*`).
