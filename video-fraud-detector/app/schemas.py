from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    video_url: str
    video_id: int
    callback_url: str = Field(..., description="URL for fraud detector to POST results when done")


class AnalyzeResponse(BaseModel):
    video_id: int
    status: str = "accepted"
    message: str = "Analysis started in background"


class CallbackPayload(BaseModel):
    video_id: int
    obscured: bool = False
    excessive_shake: bool = False
    abnormal_cut: bool = False
    messages: list[str] = Field(default_factory=list)
    confidence: float = 0.0
