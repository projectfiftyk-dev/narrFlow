from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SegmentInput(BaseModel):
    segmentNumber: int
    text: str
    voiceId: str
    tone: str | None = None
    personaId: str | None = None
    transformationId: str | None = None


class SegmentResult(BaseModel):
    segmentNumber: int
    audioUrl: str


class TTSTaskCreate(BaseModel):
    segments: list[SegmentInput]


class TTSTask(BaseModel):
    taskId: str
    status: TaskStatus
    createdAt: datetime
    updatedAt: datetime
    payload: list[SegmentInput]
    result: list[SegmentResult] = []
    error: str | None = None


class TaskStatusResponse(BaseModel):
    taskId: str
    status: TaskStatus
    result: list[SegmentResult] | None = None
    error: str | None = None


class ResolvedSegment(BaseModel):
    segmentNumber: int
    text: str
    personaId: str | None
    audioUrl: str


class TaskContentResponse(BaseModel):
    taskId: str
    status: TaskStatus
    segments: list[ResolvedSegment] | None = None
