from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

JobStatus = Literal["pending", "processing", "completed", "failed"]
JobType = Literal["scene_image", "scene_video", "final_video"]

class JobCreate(BaseModel):
    scenario_id: str
    scene_id: Optional[int] = None
    job_type: JobType
    status: JobStatus = "pending"

class JobUpdate(BaseModel):
    status: JobStatus
    result_url: Optional[str] = None
    error_message: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    scenario_id: str
    scene_id: Optional[int]
    job_type: JobType
    status: JobStatus
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime