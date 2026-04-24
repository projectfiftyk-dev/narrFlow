import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from ..database import get_db
from ..models.task import (
    ResolvedSegment,
    SegmentResult,
    TaskContentResponse,
    TaskStatus,
    TaskStatusResponse,
    TTSTask,
    TTSTaskCreate,
)
from ..services.tts import process_tts_task

router = APIRouter(prefix="/tts/tasks", tags=["tasks"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_task(payload: TTSTaskCreate, background_tasks: BackgroundTasks):
    db = get_db()
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    task = TTSTask(
        taskId=task_id,
        status=TaskStatus.PENDING,
        createdAt=now,
        updatedAt=now,
        payload=payload.segments,
    )
    await db.tts_tasks.insert_one(task.model_dump())

    background_tasks.add_task(process_tts_task, task_id, payload.segments)

    return {"status": "accepted", "taskId": task_id}


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    db = get_db()
    doc = await db.tts_tasks.find_one({"taskId": task_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    response = TaskStatusResponse(taskId=doc["taskId"], status=doc["status"])

    if doc["status"] == TaskStatus.COMPLETED:
        response.result = [SegmentResult(**r) for r in doc.get("result", [])]
    elif doc["status"] == TaskStatus.FAILED:
        response.error = doc.get("error")

    return response


@router.get("/{task_id}/content", response_model=TaskContentResponse)
async def get_task_content(task_id: str):
    db = get_db()
    doc = await db.tts_tasks.find_one({"taskId": task_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    response = TaskContentResponse(taskId=doc["taskId"], status=doc["status"])

    if doc["status"] == TaskStatus.COMPLETED:
        payload_by_number = {s["segmentNumber"]: s for s in doc.get("payload", [])}
        result_by_number = {r["segmentNumber"]: r for r in doc.get("result", [])}

        response.segments = [
            ResolvedSegment(
                segmentNumber=num,
                text=payload_by_number[num]["text"],
                personaId=payload_by_number[num].get("personaId"),
                audioUrl=result_by_number[num]["audioUrl"],
            )
            for num in sorted(payload_by_number)
            if num in result_by_number
        ]

    return response
