"""
Video Fraud Detector - FastAPI service.
Analyzes videos for fraud: camera obscuring, excessive shake, abnormal cuts.
"""
import logging
from contextlib import asynccontextmanager

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from app.analyzer import analyze_video
from app.schemas import AnalyzeRequest, AnalyzeResponse, CallbackPayload


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanup if needed


app = FastAPI(title="Video Fraud Detector", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


log = logging.getLogger(__name__)


async def run_analysis_task(video_url: str, video_id: int, callback_url: str) -> None:
    """Run analysis in background and POST result to callback_url."""
    log.info("[FRAUD] Start analysis video_id=%d callback=%s", video_id, callback_url)
    try:
        result = analyze_video(video_url)
        result.video_id = video_id

        log.info(
            "[FRAUD] Done video_id=%d obscured=%s shake=%s cut=%s messages=%s",
            video_id, result.obscured, result.excessive_shake, result.abnormal_cut, result.messages,
        )
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(callback_url, json=result.model_dump())
            log.info("[FRAUD] Callback video_id=%d status=%d", video_id, resp.status_code)
    except Exception as e:
        log.exception("[FRAUD] Error video_id=%d: %s", video_id, e)
        # On failure, still try to callback with error
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    callback_url,
                    json={
                        "video_id": video_id,
                        "obscured": False,
                        "excessive_shake": False,
                        "abnormal_cut": False,
                        "messages": [f"Lỗi phân tích: {str(e)}"],
                        "confidence": 0.0,
                    },
                )
        except Exception as cb_err:
            log.error("[FRAUD] Callback failed video_id=%d: %s", video_id, cb_err)


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
):
    """Accept analysis request, return 202 immediately, process in background."""
    background_tasks.add_task(
        run_analysis_task,
        request.video_url,
        request.video_id,
        request.callback_url,
    )
    return AnalyzeResponse(
        video_id=request.video_id,
        status="accepted",
        message="Phân tích đang chạy trong nền",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
