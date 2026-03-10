from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, ConfigDict


# -------------------------
# Enums (딱 최소)
# -------------------------
class JobType(str, Enum):
    render_scene = "render_scene"
    merge = "merge"
    render_all = "render_all"


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    canceled = "canceled"


# -------------------------
# Payload (입력)
# -------------------------
class JobPayload(BaseModel):
    """
    최소 입력 스키마:
      - scenario_id (필수)
      - scene_ids (필수, 1개 이상 권장)
      - options (선택)
    """
    model_config = ConfigDict(extra="forbid")

    scenario_id: str = Field(..., min_length=1)
    scene_ids: List[int] = Field(..., min_length=1)
    options: Dict[str, Any] = Field(default_factory=dict)


# -------------------------
# Result (성공 결과)
#   - render_scene: scenes[{id, video_url}]
#   - merge: merged_url
#   - render_all: scenes + merged_url
# -------------------------
class SceneVideo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    video_url: str = Field(..., min_length=1)


class RenderSceneResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenes: List[SceneVideo] = Field(..., min_length=1)


class MergeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    merged_url: str = Field(..., min_length=1)


class RenderAllResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenes: List[SceneVideo] = Field(..., min_length=1)
    merged_url: str = Field(..., min_length=1)


JobResult = Union[RenderSceneResult, MergeResult, RenderAllResult]


# -------------------------
# Error (실패 정보)
# -------------------------
class JobError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


# -------------------------
# Requests / Responses
# -------------------------
class JobCreateRequest(BaseModel):
    """
    POST /jobs body
    - type: render_scene | merge | render_all
    - payload: {scenario_id, scene_ids, options}
    """
    model_config = ConfigDict(extra="forbid")

    type: JobType
    payload: JobPayload


class JobOut(BaseModel):
    """
    GET /jobs/{job_id} response
    최소 스키마 그대로:
      - job_id, type, status, payload
      - result (성공 시), error(실패 시)
      - progress (0~100)
      - created_at, updated_at
    """
    model_config = ConfigDict(extra="forbid")

    job_id: str = Field(..., min_length=1)
    type: JobType
    status: JobStatus

    payload: JobPayload

    result: Optional[JobResult] = None
    error: Optional[JobError] = None

    progress: int = Field(0, ge=0, le=100)

    created_at: datetime
    updated_at: datetime